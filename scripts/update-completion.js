const { Client } = require("@notionhq/client");

// ============================================
// 설정 상수 (여기서 관리)
// ============================================
const CONFIG = {
  // 환경 변수
  NOTION_API_KEY: process.env.NOTION_API_KEY,
  NOTION_DATABASE_CAPTURE_ID: process.env.NOTION_DATABASE_CAPTURE_ID,

  // Notion DB 속성 이름
  PROPS: {
    CHECKBOX: "📌 완료 처리", // 체크박스 속성명
    STATUS: "상태", // Status 속성명
    COMPLETED_DATE: "완료일", // 완료일 속성명
    TITLE_CANDIDATES: ["이름", "Name", "제목"], // 제목 속성 후보
  },

  // 상태 값
  STATUS_VALUES: {
    COMPLETED: "✅완료", // 완료 상태값
  },
};
// ============================================

const notion = new Client({ auth: CONFIG.NOTION_API_KEY });
const databaseId = CONFIG.NOTION_DATABASE_CAPTURE_ID;

// 오늘 날짜 (YYYY-MM-DD 형식)
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// 체크박스=true AND 상태≠완료 인 페이지 조회
async function getCheckedNotCompletedPages() {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: CONFIG.PROPS.CHECKBOX,
          checkbox: {
            equals: true,
          },
        },
        {
          property: CONFIG.PROPS.STATUS,
          select: {
            does_not_equal: CONFIG.STATUS_VALUES.COMPLETED,
          },
        },
      ],
    },
  });
  return response.results;
}

// 상태=완료 AND 완료일=비어있음 인 페이지 조회
async function getCompletedWithoutDatePages() {
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      and: [
        {
          property: CONFIG.PROPS.STATUS,
          select: {
            equals: CONFIG.STATUS_VALUES.COMPLETED,
          },
        },
        {
          property: CONFIG.PROPS.COMPLETED_DATE,
          date: {
            is_empty: true,
          },
        },
      ],
    },
  });
  return response.results;
}

// 페이지 업데이트: 상태 + 완료일
async function updatePageFull(pageId, title) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [CONFIG.PROPS.STATUS]: {
        select: {
          name: CONFIG.STATUS_VALUES.COMPLETED,
        },
      },
      [CONFIG.PROPS.COMPLETED_DATE]: {
        date: {
          start: getTodayDate(),
        },
      },
    },
  });
  console.log(
    `[완료] "${title}" - 상태→${
      CONFIG.STATUS_VALUES.COMPLETED
    }, 완료일→${getTodayDate()}`
  );
}

// 페이지 업데이트: 완료일만
async function updatePageDateOnly(pageId, title) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      [CONFIG.PROPS.COMPLETED_DATE]: {
        date: {
          start: getTodayDate(),
        },
      },
    },
  });
  console.log(`[완료일 추가] "${title}" - 완료일→${getTodayDate()}`);
}

// 페이지 제목 추출
function getPageTitle(page) {
  let titleProp = null;
  for (const candidate of CONFIG.PROPS.TITLE_CANDIDATES) {
    if (page.properties[candidate]) {
      titleProp = page.properties[candidate];
      break;
    }
  }
  if (titleProp && titleProp.title && titleProp.title.length > 0) {
    return titleProp.title[0].plain_text;
  }
  return "(제목 없음)";
}

async function main() {
  console.log("=== Notion 자동 완료 처리 시작 ===");
  console.log(`실행 시간: ${new Date().toISOString()}`);
  console.log("");

  let updatedCount = 0;

  // 1. 체크박스 체크됨 + 상태≠완료 → 상태/완료일 모두 업데이트
  const checkedPages = await getCheckedNotCompletedPages();
  console.log(`체크박스 O, 상태≠완료: ${checkedPages.length}건`);

  for (const page of checkedPages) {
    const title = getPageTitle(page);
    await updatePageFull(page.id, title);
    updatedCount++;
  }

  // 2. 상태=완료 + 완료일 비어있음 → 완료일만 업데이트
  const needDatePages = await getCompletedWithoutDatePages();
  console.log(`상태=완료, 완료일 없음: ${needDatePages.length}건`);

  for (const page of needDatePages) {
    const title = getPageTitle(page);
    await updatePageDateOnly(page.id, title);
    updatedCount++;
  }

  console.log("");
  console.log(`=== 완료: 총 ${updatedCount}건 업데이트 ===`);
}

main().catch((error) => {
  console.error("에러 발생:", error.message);
  process.exit(1);
});
