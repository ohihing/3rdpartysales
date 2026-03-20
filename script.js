function render() {
    const main = document.getElementById('content-area');
    main.innerHTML = ''; 

    const isYes = currentChannel === 'yes24';
    const prefix = isYes ? 'yes' : 'ala';
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const freshBooks = allBooks.filter(b => b.openDate && b.openDate >= oneYearAgo);

    // [수정] period 속성을 추가하여 그룹화 기준을 만듭니다.
    const configs = [
        { id: 1, title: '1. 현재 판매지수 Best 10', key: `${prefix}_cur`, sort: 'desc', limit: 10, displayType: 'abs', period: 'Real-time' },
        
        { id: 2, title: '2. 작일 대비 상승 Best 5', key: `${prefix}_day`, sort: 'desc', limit: 5, displayType: 'rise', period: 'Yesterday' },
        { id: 3, title: '3. 작일 대비 하락 도서 5권', key: `${prefix}_day`, sort: 'asc', limit: 5, displayType: 'fall', period: 'Yesterday' },
        
        { id: 4, title: '4. 최근 1주일 상승 Best 5', key: `${prefix}_week`, sort: 'desc', limit: 5, displayType: 'rise', period: 'Weekly' },
        { id: 5, title: '5. 최근 1주일 하락 도서 5권', key: `${prefix}_week`, sort: 'asc', limit: 5, displayType: 'fall', period: 'Weekly' },
        
        { id: 6, title: '6. 최근 1달 상승 Best 5', key: `${prefix}_month`, sort: 'desc', limit: 5, displayType: 'rise', period: 'Monthly' },
        { id: 7, title: '7. 최근 1달 하락 도서 5권', key: `${prefix}_month`, sort: 'asc', limit: 5, displayType: 'fall', period: 'Monthly' }
    ];

    let lastPeriod = ""; // 이전에 렌더링한 기간을 기억합니다.

    configs.forEach(conf => {
        let filtered = freshBooks.filter(b => !isNaN(b[conf.key]));
        if (conf.displayType === 'rise') filtered = filtered.filter(b => b[conf.key] > 0);
        if (conf.displayType === 'fall') filtered = filtered.filter(b => b[conf.key] < 0);

        filtered.sort((a, b) => conf.sort === 'desc' ? b[conf.key] - a[conf.key] : a[conf.key] - b[conf.key]);
        const finalData = filtered.slice(0, conf.limit);

        if (finalData.length > 0) {
            // [추가] 기간(period)이 바뀌었을 때만 구분 장치를 생성합니다.
            if (conf.period !== lastPeriod) {
                const divider = document.createElement('div');
                divider.className = 'period-divider';
                
                // 한글 매핑 (원하시면 영어 그대로 두셔도 됩니다)
                const periodNames = { 'Real-time': '현재', 'Yesterday': '어제', 'Weekly': '1주일', 'Monthly': '한달' };
                
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
