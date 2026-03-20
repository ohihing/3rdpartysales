const SHEET_ID = '1os9N1ZIbicQu-F81_xvJ-ruzWptAP8FZT6tut5ZWT44';
const SHEET_NAME = '마스터_DB';
const JSON_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;

let allBooks = [];
let currentChannel = 'yes24';

// 구글 특유의 날짜 형식 "Date(2026,2,20)"을 자바스크립트 날짜로 변환
function parseGoogleDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const match = dateStr.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (match) {
        return new Date(match[1], match[2], match[3]);
    }
    return new Date(dateStr);
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
            if (!c || !c[0]) return null;
            return {
                title: c[0].v ? String(c[0].v) : "",
                openDate: c[3] ? parseGoogleDate(c[3].v) : null,
                yes_cur: c[6] && c[6].v != null ? Number(c[6].v) : NaN, 
                yes_day: c[8] && c[8].v != null ? Number(c[8].v) : NaN,
                yes_week: c[10] && c[10].v != null ? Number(c[10].v) : NaN,
                yes_month: c[12] && c[12].v != null ? Number(c[12].v) : NaN,
                ala_cur: c[13] && c[13].v != null ? Number(c[13].v) : NaN,
                ala_day: c[15] && c[15].v != null ? Number(c[15].v) : NaN,
                ala_week: c[17] && c[17].v != null ? Number(c[17].v) : NaN,
                ala_month: c[19] && c[19].v != null ? Number(c[19].v) : NaN,
                img: c[20] ? String(c[20].v) : ""
            };
        }).filter(b => b && b.title);

        switchChannel('yes24');
        document.getElementById('update-time').innerText = `마지막 업데이트: ${new Date().toLocaleString('ko-KR')}`;
    } catch (e) { 
        console.error("데이터 로딩 실패:", e);
        document.getElementById('update-time').innerText = "데이터 로딩 실패 (시트 공유 상태 확인 필요)";
    }
}

function switchChannel(channel) {
    currentChannel = channel;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        const isMatch = (channel === 'yes24' && btn.innerText.includes('예스')) || 
                        (channel === 'aladin' && btn.innerText.includes('알라딘'));
        btn.classList.toggle('active', isMatch);
    });
    render();
}

function render() {
    const main = document.getElementById('content-area');
    if (!main) return;
    main.innerHTML = ''; 

    const isYes = currentChannel === 'yes24';
    const prefix = isYes ? 'yes' : 'ala';
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
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
    const periodNames = { 'Real-time': '현재', 'Yesterday': '어제', 'Weekly': '1주일', 'Monthly': '한달' };

    configs.forEach(conf => {
        let filtered = freshBooks.filter(b => !isNaN(b[conf.key]));
        if (conf.displayType === 'rise') filtered = filtered.filter(b => b[conf.key] > 0);
        if (conf.displayType === 'fall') filtered = filtered.filter(b => b[conf.key] < 0);

        filtered.sort((a, b) => conf.sort === 'desc' ? b[conf.key] - a[conf.key] : a[conf.key] - b[conf.key]);
        const finalData = filtered.slice(0, conf.limit);

        if (finalData.length > 0) {
            // 기간이 바뀔 때 구분선(Divider) 생성
            if (conf.period !== lastPeriod) {
                const divider = document.createElement('div');
                divider.className = 'period-divider';
                divider.innerHTML = `
                    <span class="period-badge">${periodNames[conf.period]}</span>
                    <div class="period-line"></div>
                `;
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
