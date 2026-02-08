let statusChart = null;
let trendChart = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchData();

    document.getElementById('refreshBtn').addEventListener('click', fetchData);
    document.getElementById('executeBtn').addEventListener('click', handleExecute);
});

async function fetchData() {
    const statusEl = document.getElementById('status');
    statusEl.classList.add('hidden');

    try {
        const response = await fetch('/api/preview');
        const result = await response.json();

        if (result.error) {
            showStatus(result.error, 'error');
            return;
        }

        renderTable(result.headers, result.data);
        updateStats(result.headers, result.data);
    } catch (error) {
        showStatus('無法連線至伺服器', 'error');
    }
}

function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status-msg ${type}`;
    statusEl.classList.remove('hidden');
}

function renderTable(headers, data) {
    const head = document.getElementById('tableHead');
    const body = document.getElementById('tableBody');

    head.innerHTML = '';
    body.innerHTML = '';

    if (!headers || headers.length === 0) {
        body.innerHTML = '<tr><td colspan="100" style="text-align:center">未找到資料</td></tr>';
        return;
    }

    // Headers
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        head.appendChild(th);
    });

    // Rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(h => {
            const td = document.createElement('td');
            td.textContent = row[h] || '';
            tr.appendChild(td);
        });
        body.appendChild(tr);
    });
}

function updateStats(headers, data) {
    const total = data.length;
    let replied = 0;
    let pending = 0;
    const dateCounts = {};

    console.log('[Debug] Headers:', headers);

    // Find date field with more keywords
    const dateKeywords = ['日期', 'Date', 'Time', '時間', '建立', 'Created', 'Timestamp'];
    const dateField = headers.find(h =>
        dateKeywords.some(key => h.toLowerCase().includes(key.toLowerCase()))
    );

    console.log('[Debug] Detected Date Field:', dateField);

    data.forEach(item => {
        // Replied / Pending
        if (item['是否自動回覆'] && item['是否自動回覆'].trim() !== '') {
            replied++;
        } else {
            pending++;
        }

        // Trend calculation
        if (dateField && item[dateField]) {
            let dateKey = '';
            const rawVal = String(item[dateField]).trim();

            if (rawVal) {
                const dateObj = new Date(rawVal);
                if (!isNaN(dateObj.getTime())) {
                    dateKey = dateObj.toISOString().split('T')[0];
                } else {
                    // Fallback for custom formats like "2023/10/01 12:00" or "2023.10.01"
                    dateKey = rawVal.split(' ')[0].replace(/[\/.]/g, '-');
                }

                if (dateKey && dateKey.includes('-')) {
                    dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1;
                }
            }
        }
    });

    console.log('[Debug] Date Counts:', dateCounts);

    // Animate numbers
    animateValue('totalUsers', total);
    animateValue('pendingUsers', pending);
    animateValue('repliedUsers', replied);

    renderCharts(replied, pending, dateCounts);
}

function animateValue(id, endValue) {
    const element = document.getElementById(id);
    let startValue = 0;
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(progress * endValue);
        element.textContent = current;
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = endValue;
        }
    }
    requestAnimationFrame(update);
}

function renderCharts(replied, pending, dateCounts) {
    const chartConfig = {
        fontColor: '#94a3b8',
        fontFamily: "'JetBrains Mono', monospace"
    };

    // 1. Status Doughnut Chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    if (statusChart) statusChart.destroy();
    statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: ['已回覆', '待處理'],
            datasets: [{
                data: [replied, pending],
                backgroundColor: ['#00ff9d', '#ffb800'],
                borderColor: '#0a0b14',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: chartConfig.fontColor, font: { family: chartConfig.fontFamily } } }
            }
        }
    });

    // 2. Trend Bar Chart
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    if (trendChart) trendChart.destroy();

    const sortedDates = Object.keys(dateCounts).sort();
    const trendData = sortedDates.map(d => dateCounts[d]);

    trendChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
            labels: sortedDates.length ? sortedDates : ['No Data'],
            datasets: [{
                label: '新增使用者',
                data: trendData.length ? trendData : [0],
                backgroundColor: '#00f3ff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: chartConfig.fontColor }, grid: { display: false } },
                y: { ticks: { color: chartConfig.fontColor }, grid: { color: 'rgba(255,255,255,0.05)' } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

async function handleExecute() {
    if (!confirm('您確定要發送 Email 給所有待處理的使用者嗎？')) return;

    const btn = document.getElementById('executeBtn');
    const originalText = btn.textContent;

    btn.disabled = true;
    btn.textContent = '處理中...';
    showStatus('正在執行自動化任務，請稍候...', 'success');

    try {
        const response = await fetch('/api/execute', { method: 'POST' });
        const result = await response.json();

        if (response.ok) {
            showStatus(`成功: ${result.message}。已處理 ${result.processed} 封郵件。`, 'success');
            fetchData(); // Refresh data
        } else {
            showStatus(`錯誤: ${result.error || '執行失敗'}`, 'error');
        }
    } catch (error) {
        showStatus('錯誤: 無法連線至伺服器', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}
