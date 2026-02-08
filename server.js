require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Google Sheets Auth
const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : ''
    }
});

// Helper: Get First Sheet Name
async function getFirstSheetName(spreadsheetId) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    return meta.data.sheets[0].properties.title;
}

// Helper: Column Index to Letter (0 -> A, 1 -> B...)
function getColumnLetter(colIndex) {
    let letter = '';
    while (colIndex >= 0) {
        letter = String.fromCharCode((colIndex % 26) + 65) + letter;
        colIndex = Math.floor(colIndex / 26) - 1;
    }
    return letter;
}

// Health Check API
app.get('/health', (req, res) => {
    res.json({ ok: true });
});

// API: Preview Data
app.get('/api/preview', async (req, res) => {
    try {
        const spreadsheetId = process.env.SPREADSHEET_ID;
        const sheetName = await getFirstSheetName(spreadsheetId);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:Z`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.json({ headers: [], data: [] });
        }

        const headers = rows[0];
        const data = rows.slice(1).map((row, index) => {
            const obj = { _rowIndex: index + 2 };
            headers.forEach((header, i) => {
                obj[header] = row[i] || "";
            });
            return obj;
        });

        res.json({ headers, data });
    } catch (error) {
        console.error('[API/Preview Error]:', error.message);
        if (error.response) console.error('Data:', error.response.data);
        res.status(500).json({ error: '無法從 Google 試算表讀取資料', details: error.message });
    }
});

// API: Execute Automation
app.post('/api/execute', async (req, res) => {
    try {
        const spreadsheetId = process.env.SPREADSHEET_ID;
        const sheetName = await getFirstSheetName(spreadsheetId);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!A:Z`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            return res.status(400).json({ error: '試算表中無資料' });
        }

        const headers = rows[0];
        const nameIdx = headers.indexOf('姓名');
        const emailIdx = headers.indexOf('Email');
        const statusIdx = headers.indexOf('是否自動回覆');

        if (nameIdx === -1 || emailIdx === -1 || statusIdx === -1) {
            return res.status(400).json({ error: '找不到必要的欄位 (姓名, Email, 是否自動回覆)' });
        }

        let processedCount = 0;
        const statusColLetter = getColumnLetter(statusIdx);

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const rowIndex = i + 1;
            const name = row[nameIdx];
            const email = row[emailIdx];
            const status = row[statusIdx];

            // 只有當「是否自動回覆」為空白或是 'N' 才處理
            const currentStatus = (status || "").trim().toUpperCase();
            if (currentStatus === '' || currentStatus === 'N') {
                if (name && email) {
                    // 寄件
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: email,
                        subject: '感謝您喜愛我們的產品！',
                        text: `Hi ${name},\n\n感謝您喜歡我們的某項產品！我們很高興能為您服務。\n\nBest regards,\nYanwun`
                    });

                    // 更新試算表狀態為 'Y'
                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `${sheetName}!${statusColLetter}${rowIndex}`,
                        valueInputOption: 'RAW',
                        requestBody: {
                            values: [['Y']]
                        }
                    });

                    processedCount++;
                }
            }
        }

        res.json({ message: '執行完成', processed: processedCount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: '執行任務失敗' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
