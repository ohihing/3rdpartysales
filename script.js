// 1. 대표님의 시트 ID (주소창의 d/ 뒤에 있는 문자열)
const SHEET_ID = '1os9N1ZIbicQu-F81_xvJ-ruzWptAP8FZT6tut5ZWT44';
const SHEET_NAME = '마스터_DB';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

async function fetchSheetData() {
    try {
        const response = await fetch(CSV_URL);
        const data = await response.text();
        const rows = data.split('\n').map(row => row.split('","').map(cell => cell.replace(/"/g, '')));
        
        // 2행부터 데이터 시작 (헤더 제외)
        const books = rows.slice(1).map(row => ({
            title: row[0],
            openDate: new Date(row[3]),
            yesDailyChange: row[8], // I열
            alaDailyChange: row[15] // P열
        }));

        renderDashboard(books);
        document.getElementById('update-time').innerText = `마지막 업데이트: ${new Date().toLocaleString()}`;
    } catch (error) {
        console.error('데이터 로딩 실패:', error);
    }
}

function renderDashboard(books) {
    const today = new Date();
    const oneYearAgo = new Date(today.setFullYear(today.getFullYear() - 1));

    // 신간(1년 이내) + 숫자 데이터만 필터링
    const freshBooks = books.filter(b => b.openDate >= oneYearAgo);

    // 예시: 예스24 급상승 Best 5 추출 및 화면 표시
    const dailyRise = freshBooks
        .filter(b => !isNaN(b.yesDailyChange) && b.yesDailyChange > 0)
        .sort((a, b) => b.yesDailyChange - a.yesDailyChange)
        .slice(0, 5);

    const container = document.getElementById('daily-rise-grid');
    container.innerHTML = dailyRise.map((book, idx) => `
        <div class="book-card">
            <span class="rank">${idx + 1}</span>
            <span class="title">${book.title}</span>
            <span class="change rise">+${Number(book.yesDailyChange).toLocaleString()}</span>
        </div>
    `).join('');
}

fetchSheetData();