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
                openDateStr: c[3] ? String(c[3].f || c[3].v) : "", 
                openDate: c[3] ? parseGoogleDate(c[3].v) : null,
                yes_cur: parseSafeNumber(c[6]), yes_day: parseSafeNumber(c[8]), yes_week: parseSafeNumber(c[10]), yes_month: parseSafeNumber(c[12]),
                ala_cur: parseSafeNumber(c[13]), ala_day: parseSafeNumber(c[15]), ala_week: parseSafeNumber(c[17]), ala_month: parseSafeNumber(c[19]),
                img: c[20] ? String(c[20].v) : ""
            };
        }).filter(b => b.title && b.title !== "null");

        render();
        document.getElementById('update-time').innerText = `마지막 업데이트: ${new Date().toLocaleString('ko-KR')}`;
    } catch (e) { console.error("데이터 로딩 실패:", e); }
}

// --- 유틸리티 함수 ---
function parseGoogleDate(d) {
    const m = String(d).match(/Date\((\d+),(\d+),(\d+)\)/);
    if (m) return new Date(m[1], m[2], m[3]);
    return new Date(d);
}

function parseSafeNumber(cell) {
    if (!cell || cell.v === null || cell.v === undefined || cell.v === "집계중") return NaN;
    return typeof cell.v === 'number' ? cell.v : Number(String(cell.v).replace(/,/g, ''));
}

// --- 메뉴 및 페이지 제어 ---
function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function showPage(page) {
    currentPage = page;
    document.getElementById('page-title').innerHTML = page === 'dashboard' ? '출판콘텐츠사업단 <span>신간 판매 현황</span>' : '최근도서 <span>판매지수 현황</span>';
    document.getElementById('dashboard-view').style.display = page === 'dashboard' ? 'block' : 'none';
    document.getElementById('stock-view').style.display = page === 'stock' ? 'block' : 'none';
    if(document.getElementById('sidebar').classList.contains('open')) toggleMenu();
    render();
}

function switchChannel(channel) {
    currentChannel = channel;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(channel === 'yes24' ? '예스' : '알라딘'));
    });
    render();
}

// --- 렌더링 통합 엔진 ---
function render() {
    if (currentPage === 'dashboard') renderDashboard();
    else renderStockView();
}

// 변화량 표시 유틸리티 (NaN 및 무변동 처리)
function getChangeDisplay(val) {
    if (isNaN(val)) return { str: '-', class: 'val-no-change' };
    if (val === 0) return { str: '-', class: 'val-no-change' };
    if (val > 0) return { str: '↑ ' + Math.abs(val).toLocaleString(), class: 'val-rise' };
    return { str: '↓ ' + Math.abs(val).toLocaleString(), class: 'val-fall' };
}

// 1. [현황판 페이지]
function renderStockView() {
    const container = document.getElementById('stock-view');
    container.innerHTML = '';
    const isYes = currentChannel === 'yes24';
    const prefix = isYes ? 'yes' : 'ala';
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const books = allBooks.filter(b => b.openDate && b.openDate >= oneYearAgo)
                          .sort((a, b) => b.openDate - a.openDate);

    // [추가] 설명행 (Header) 생성
    const header = document.createElement('div');
    header.className = 'stock-header';
    header.innerHTML = `
        <div style="font-size:0.7rem">순번</div>
        <div>도서제목</div>
        <div style="text-align:right">현재 지수</div>
        <div style="text-align:right">작일 변화 / 주 변화 / 월 변화</div>
        <div style="text-align:center">추세</div>
    `;
    container.appendChild(header);

    books.forEach((b, i) => {
        const cur = b[`${prefix}_cur`];
        const d = b[`${prefix}_day`];
        const w = b[`${prefix}_week`];
        const m = b[`${prefix}_month`];

        // NaN 및 무변동 처리된 변화량 가져오기
        const dDisplay = getChangeDisplay(d);
        const wDisplay = getChangeDisplay(w);
        const mDisplay = getChangeDisplay(m);

        const item = document.createElement('div');
        item.className = 'stock-item';
        item.innerHTML = `
            <div class="rank" style="color:#999; font-size:0.8rem">${i+1}</div>
            <div class="book-info">
                <div class="stock-title">${b.title}</div>
                <div class="stock-date">${b.openDateStr} 등록</div>
            </div>
            <div class="stock-val">${isNaN(cur) ? '-' : cur.toLocaleString()}</div>
            <div class="stock-change-group">
                <div class="stock-sub-val ${dDisplay.class}">${dDisplay.str} (작일)</div>
                <div class="stock-sub-val" style="font-size:0.65rem; color:#666">
                    <span class="${wDisplay.class}">주 ${wDisplay.str.replace('↑ ', '↑').replace('↓ ', '↓')}</span> | 
                    <span class="${mDisplay.class}">월 ${mDisplay.str.replace('↑ ', '↑').replace('↓ ', '↓')}</span>
                </div>
            </div>
            <div class="sparkline-container"><canvas id="spark-${prefix}-${i}" width="100" height="35"></canvas></div>
        `;
        container.appendChild(item);
        drawSparkline(`spark-${prefix}-${i}`, [cur - m || cur, cur - w || cur, cur - d || cur, cur]);
    });
}

// 2. [대시보드 페이지]
function renderDashboard() {
    const main = document.getElementById('dashboard-view');
    main.innerHTML = ''; 
    const isYes = currentChannel === 'yes24';
    const prefix = isYes ? 'yes' : 'ala';
    const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
    const freshBooks = allBooks.filter(b => b.openDate && b.openDate >= oneYearAgo);

    const configs = [
        { title: '1. 현재 판매지수 Best 10', key: `${prefix}_cur`, sort: 'desc', limit: 10, displayType: 'abs', period: 'Real-time' },
        { title: '2. 작일 대비 상승 Best 5', key: `${prefix}_day`, sort: 'desc', limit: 5, displayType: 'rise', period: 'Yesterday' },
        { title: '3. 작일 대비 하락 도서 5권', key: `${prefix}_day`, sort: 'asc', limit: 5, displayType: 'fall', period: 'Yesterday' },
        { title: '4. 최근 1주일 상승 Best 5', key: `${prefix}_week`, sort: 'desc', limit: 5, displayType: 'rise', period: 'Weekly' },
        { title: '5. 최근 1주일 하락 도서 5권', key: `${prefix}_week`, sort: 'asc', limit: 5, displayType: 'fall', period: 'Weekly' },
        { title: '6. 최근 1달 상승 Best 5', key: `${prefix}_month`, sort: 'desc', limit: 5, displayType: 'rise', period: 'Monthly' },
        { title: '7. 최근 1달 하락 도서 5권', key: `${prefix}_month`, sort: 'asc', limit: 5, displayType: 'fall', period: 'Monthly' }
    ];

    let lastPeriod = "";
    configs.forEach(conf => {
        let filtered = freshBooks.filter(b => !isNaN(b[conf.key]));
        if (conf.displayType === 'rise') filtered = filtered.filter(b => b[conf.key] > 0);
        if (conf.displayType === 'fall') filtered = filtered.filter(b => b[conf.key] < 0);
        filtered.sort((a, b) => conf.sort === 'desc' ? b[conf.key] - a[conf.key] : a[conf.key] - b[conf.key]);
        const finalData = filtered.slice(0, conf.limit);

        if (finalData.length > 0) {
            if (conf.period !== lastPeriod) {
                const divider = document.createElement('div');
                divider.className = 'period-divider';
                const periodNames = { 'Real-time': '현재', 'Yesterday': '어제', 'Weekly': '1주일', 'Monthly': '한달' };
                divider.innerHTML = `<span class="period-badge">${periodNames[conf.period]}</span><div class="period-line"></div>`;
                main.appendChild(divider);
                lastPeriod = conf.period;
            }
            const section = document.createElement('section');
            const colorClass = conf.displayType === 'rise' ? 'rise' : (conf.displayType === 'fall' ? 'fall' : '');
            section.innerHTML = `<div class="section-title ${colorClass}">${conf.title}</div>`;
            const list = document.createElement('div');
            list.className = 'list-wrapper';
            finalData.forEach((b, i) => {
                const val = b[conf.key];
                const displayVal = conf.displayType === 'abs' ? val.toLocaleString() : `${val > 0 ? '↑' : '↓'} ${Math.abs(val).toLocaleString()}`;
                const valClass = conf.displayType === 'abs' ? '' : (val > 0 ? 'val-rise' : 'val-fall');
                list.innerHTML += `
                    <div class="book-card">
                        <div class="rank">${i + 1}</div>
                        <img class="book-img" src="${b.img || 'https://via.placeholder.com/45x65?text=No+Img'}" onerror="this.src='https://via.placeholder.com/45x65?text=Error'">
                        <div class="book-info"><div class="book-title">${b.title}</div><div class="book-val ${valClass}">${displayVal}</div></div>
                    </div>`;
            });
            section.appendChild(list);
            main.appendChild(section);
        }
    });
}

// 3. 스파크라인 그리기 함수
function drawSparkline(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const filteredData = data.filter(v => !isNaN(v));
    if (filteredData.length < 2) return;

    const min = Math.min(...filteredData);
    const max = Math.max(...filteredData);
    const range = max - min || 1;
    
    // PC/모바일 선 굵기 대응
    ctx.strokeStyle = filteredData[filteredData.length-1] >= filteredData[0] ? '#eb4d4b' : '#0984e3';
    ctx.lineWidth = window.innerWidth <= 650 ? 1.5 : 2; 
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    filteredData.forEach((v, i) => {
        const x = (i / (filteredData.length - 1)) * canvas.width;
        const y = canvas.height - ((v - min) / range) * canvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

init();
