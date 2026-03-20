const SHEET_ID = '1os9N1ZIbicQu-F81_xvJ-ruzWptAP8FZT6tut5ZWT44';
const SHEET_NAME = '마스터_DB';
const JSON_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

let allBooks = [];
let currentChannel = 'yes24';
let currentPage = 'dashboard';

// --- 초기화 및 데이터 로딩 ---
async function init() {
    try {
        const response = await fetch(JSON_URL);
        const text = await response.text();
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        const jsonData = JSON.parse(text.substring(start, end + 1));
        const rows = jsonData.table.rows;
        
        allBooks = rows.map(row => {
            const c = row.c;
            return {
                title: c[0] ? String(c[0].v) : "",
                openDateStr: c[3] ? String(c[3].f || c[3].v) : "", // 날짜 텍스트 보관
                openDate: c[3] ? parseGoogleDate(c[3].v) : null,
                yes_cur: parseSafeNumber(c[6]), yes_day: parseSafeNumber(c[8]), yes_week: parseSafeNumber(c[10]), yes_month: parseSafeNumber(c[12]),
                ala_cur: parseSafeNumber(c[13]), ala_day: parseSafeNumber(c[15]), ala_week: parseSafeNumber(c[17]), ala_month: parseSafeNumber(c[19]),
                img: c[20] ? String(c[20].v) : ""
            };
        }).filter(b => b.title && b.title !== "null");

        render();
        document.getElementById('update-time').innerText = `업데이트: ${new Date().toLocaleString('ko-KR')}`;
    } catch (e) { console.error(e); }
}

// --- 유틸리티 함수 ---
function parseGoogleDate(d) {
    const m = String(d).match(/Date\((\d+),(\d+),(\d+)\)/);
    return m ? new Date(m[1], m[2], m[3]) : new Date(d);
}
function parseSafeNumber(cell) {
    if (!cell || cell.v === null || cell.v === "집계중") return NaN;
    return typeof cell.v === 'number' ? cell.v : Number(String(cell.v).replace(/,/g, ''));
}

// --- 메뉴 제어 ---
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function showPage(page) {
    currentPage = page;
    document.getElementById('page-title').innerHTML = page === 'dashboard' ? '출판콘텐츠사업단 <span>신간 판매 현황</span>' : '최근도서 <span>판매지수 현황</span>';
    document.getElementById('dashboard-view').style.display = page === 'dashboard' ? 'block' : 'none';
    document.getElementById('stock-view').style.display = page === 'stock' ? 'block' : 'none';
    toggleMenu();
    render();
}

function switchChannel(channel) {
    currentChannel = channel;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(channel === 'yes24' ? '예스' : '알라딘'));
    });
    render();
}

// --- 렌더링 엔진 ---
function render() {
    if (currentPage === 'dashboard') renderDashboard();
    else renderStockView();
}

function renderStockView() {
    const container = document.getElementById('stock-view');
    container.innerHTML = '';
    const isYes = currentChannel === 'yes24';
    const prefix = isYes ? 'yes' : 'ala';
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const books = allBooks.filter(b => b.openDate && b.openDate >= oneYearAgo)
                          .sort((a, b) => b[`${prefix}_cur`] - a[`${prefix}_cur`]);

    books.forEach((b, i) => {
        const cur = b[`${prefix}_cur`];
        const d = b[`${prefix}_day`];
        const w = b[`${prefix}_week`];
        const m = b[`${prefix}_month`];

        const item = document.createElement('div');
        item.className = 'stock-item';
        item.innerHTML = `
            <div class="rank" style="color:#999; font-size:0.8rem">${i+1}</div>
            <div class="book-info">
                <div class="stock-title">${b.title}</div>
                <div class="stock-date">${b.openDateStr} 등록</div>
            </div>
            <div class="stock-val">${cur.toLocaleString()}</div>
            <div class="stock-change-group">
                <div class="stock-sub-val ${d > 0 ? 'val-rise' : 'val-fall'}">${d > 0 ? '↑' : '↓'} ${Math.abs(d).toLocaleString()} (작일)</div>
                <div class="stock-sub-val" style="font-size:0.65rem; color:#666">주 ${w > 0 ? '↑' : '↓'}${Math.abs(w).toLocaleString()} | 월 ${m > 0 ? '↑' : '↓'}${Math.abs(m).toLocaleString()}</div>
            </div>
            <div class="sparkline-container"><canvas id="spark-${prefix}-${i}"></canvas></div>
        `;
        container.appendChild(item);
        drawSparkline(`spark-${prefix}-${i}`, [cur - m || cur, cur - w || cur, cur - d || cur, cur]);
    });
}

// 스파크라인 그리기 (4개 지점 추세)
function drawSparkline(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const filteredData = data.filter(v => !isNaN(v));
    if (filteredData.length < 2) return;

    const min = Math.min(...filteredData);
    const max = Math.max(...filteredData);
    const range = max - min || 1;
    
    ctx.strokeStyle = filteredData[filteredData.length-1] >= filteredData[0] ? '#eb4d4b' : '#0984e3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    filteredData.forEach((v, i) => {
        const x = (i / (filteredData.length - 1)) * canvas.width;
        const y = canvas.height - ((v - min) / range) * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

// renderDashboard는 기존 코드를 그대로 사용 (생략)
init();
