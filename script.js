const SHEET_ID = '1os9N1ZIbicQu-F81_xvJ-ruzWptAP8FZT6tut5ZWT44';
const SHEET_NAME = '마스터_DB';
const JSON_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

let allBooks = [];
let currentChannel = 'yes24';

// [안전장치 1] 구글 날짜 형식 변환
function parseGoogleDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const match = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) return new Date(match[1], match[2], match[3]);
    return new Date(dateStr);
}

// [안전장치 2] 숫자 변환 (쉼표 제거 및 텍스트 예외 처리)
function parseSafeNumber(cell) {
    if (!cell || cell.v === null || cell.v === undefined || cell.v === "집계중") return NaN;
    if (typeof cell.v === 'number') return cell.v;
    const cleaned = String(cell.v).replace(/,/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? NaN : num;
}

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
                openDate: c[3] ? parseGoogleDate(c[3].v) : null,
                yes_cur: parseSafeNumber(c[6]), 
                yes_day: parseSafeNumber(c[8]),
                yes_week: parseSafeNumber(c[10]),
                yes_month: parseSafeNumber(c[12]),
                ala_cur: parseSafeNumber(c[13]),
                ala_day: parseSafeNumber(c[15]),
                ala_week: parseSafeNumber(c[17]),
                ala_month: parseSafeNumber(c[19]),
                img: c[20] ? String(c[20].v) : ""
            };
        }).filter(b => b.title && b.title !== "null");

        switchChannel('yes24');
        document.getElementById('update-time').innerText = `마지막 업데이트: ${new Date().toLocaleString('ko-KR')}`;
    } catch (e) { 
        console.error("데이터 로딩 실패:", e);
    }
}

function switchChannel(channel) {
    currentChannel = channel;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(channel === 'yes24' ? '예스' : '알라딘'));
    });
    render();
}

function render() {
    const main = document.getElementById('content-area');
    main.innerHTML = ''; 

    const isYes = currentChannel === 'yes24';
    const prefix = isYes ? 'yes' : 'ala';
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const freshBooks = allBooks.filter(b => b.openDate && b.openDate >= oneYearAgo);

    // [핵심] period 속성이 포함된 구성 리스트
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
            // 기간 구분 배지 생성 (그룹이 바뀔 때만)
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
                let displayVal = "";
                let valClass = "";

                if (conf.displayType === 'abs') {
                    displayVal = val.toLocaleString(); 
                } else {
                    const arrow = val > 0 ? '↑' : '↓';
                    displayVal = `${arrow} ${Math.abs(val).toLocaleString()}`; 
                    valClass = val > 0 ? 'val-rise' : 'val-fall';
                }

                list.innerHTML += `
                    <div class="book-card">
                        <div class="rank">${i + 1}</div>
                        <img class="book-img" src="${b.img || 'https://via.placeholder.com/45x65?text=No+Img'}" onerror="this.src='https://via.placeholder.com/45x65?text=Error'">
                        <div class="book-info">
                            <div class="book-title">${b.title}</div>
                            <div class="book-val ${valClass}">${displayVal}</div>
                        </div>
                    </div>
                `;
            });
            section.appendChild(list);
            main.appendChild(section);
        }
    });
}

init();
