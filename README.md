# Notion 자동 완료 처리

Notion Capture DB에서 체크박스를 체크하면 자동으로 상태와 완료일을 업데이트합니다.

## 동작 방식

- GitHub Actions가 **5분마다** Notion API 폴링
- 체크박스=true AND 상태≠완료 → 상태를 "완료"로, 완료일을 오늘 날짜로 설정
- 상태=완료 AND 완료일=비어있음 → 완료일만 오늘 날짜로 설정

---

## 세팅 가이드

### 1단계: Notion Integration 생성

1. [Notion Integrations](https://www.notion.so/my-integrations) 페이지 접속
2. **"+ New integration"** 클릭
3. 설정:
   - Name: `자동완료처리` (원하는 이름)
   - Associated workspace: 본인 워크스페이스 선택
   - Capabilities: **Read content**, **Update content** 체크
4. **Submit** 클릭
5. **Internal Integration Secret** 복사해두기 (나중에 사용)

### 2단계: Notion DB에 Integration 연결

1. Capture DB 페이지 열기
2. 우측 상단 **···** 클릭 → **Connections** → **Connect to** → 방금 만든 Integration 선택
3. **Confirm** 클릭

### 3단계: Database ID 확인

Notion DB URL에서 ID 추출:
```
https://www.notion.so/워크스페이스/DATABASE_ID?v=뷰ID
                            ^^^^^^^^^^^^^^^^
                            이 부분이 Database ID (32자리)
```

예시: `https://www.notion.so/myspace/abc123def456...?v=...`
→ Database ID: `abc123def456...`

### 4단계: GitHub Repository 생성

1. [GitHub](https://github.com) 접속
2. **New repository** 클릭
3. 설정:
   - Repository name: `notion-automation`
   - Public 선택 (Private은 Actions 시간 제한 있음)
4. **Create repository** 클릭

### 5단계: 코드 업로드

터미널에서:
```bash
cd notion-automation
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/notion-automation.git
git push -u origin main
```

### 6단계: GitHub Secrets 설정

1. GitHub Repository 페이지 → **Settings** 탭
2. 왼쪽 메뉴 **Secrets and variables** → **Actions**
3. **New repository secret** 클릭하여 2개 추가:

| Name | Value |
|------|-------|
| `NOTION_API_KEY` | 1단계에서 복사한 Integration Secret |
| `NOTION_DATABASE_ID` | 3단계에서 확인한 Database ID |

### 7단계: Actions 활성화 확인

1. Repository → **Actions** 탭
2. "I understand my workflows, go ahead and enable them" 클릭 (표시되는 경우)
3. 5분 뒤 자동 실행 시작!

---

## 수동 실행 (테스트)

1. **Actions** 탭 → **Notion Auto Complete** 선택
2. **Run workflow** 버튼 클릭
3. 실행 로그 확인

---

## iOS Shortcuts 연동 (선택)

즉시 트리거를 원하면 iOS Shortcuts에서 다음 URL을 POST 요청:

```
POST https://api.github.com/repos/YOUR_USERNAME/notion-automation/actions/workflows/notion-complete.yml/dispatches
```

Headers:
```
Authorization: Bearer YOUR_GITHUB_TOKEN
Accept: application/vnd.github.v3+json
```

Body:
```json
{"ref": "main"}
```

GitHub Personal Access Token 생성:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. **Generate new token** → `repo` 권한 체크 → 생성

---

## DB 속성 이름 변경 시

[scripts/update-completion.js](scripts/update-completion.js)에서 속성 이름 수정:

```javascript
// 현재 설정된 속성 이름
"완료"    // 체크박스
"상태"    // Status 타입
"완료일"  // Date 타입
```

---

## 문제 해결

### Actions가 실행되지 않음
- Repository가 Public인지 확인
- Actions 탭에서 워크플로우가 활성화되어 있는지 확인

### "Could not find database" 에러
- Database ID가 정확한지 확인
- Integration이 DB에 연결되어 있는지 확인

### 속성을 찾을 수 없음 에러
- Notion DB의 속성 이름이 스크립트와 일치하는지 확인
- "완료", "상태", "완료일" 속성이 존재하는지 확인
