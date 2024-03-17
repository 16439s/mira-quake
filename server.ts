import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

// p2pquakeのAPIエンドポイント
const P2PQUAKE_API_ENDPOINT = 'https://api.p2pquake.net/v2/history?codes=551&limit=1';

// MisskeyのAPIエンドポイントとトークン
const MISSKEY_API_ENDPOINT = 'https://freelynetwork.jp/api/notes/create';
const MISSKEY_API_TOKEN = process.env.MISSKEY_API_TOKEN;

// 前回の地震情報を保持する変数
let previousEarthquakeData: any = null;

// 定期的に地震情報を取得して処理する関数
function fetchAndProcessEarthquakeData() {
    fetchEarthquakeData(); // 初回呼び出し

    // 1分ごとに地震情報を取得し処理する
    setInterval(fetchEarthquakeData, 60000);
}

// HTTPリクエストを送信して地震データを取得する関数
function fetchEarthquakeData() {
    https.get(P2PQUAKE_API_ENDPOINT, (res) => {
        let data = '';

        // データを受信するたびにコールバックが呼び出される
        res.on('data', (chunk) => {
            data += chunk;
        });

        // データの受信が完了した後に呼び出される
        res.on('end', () => {
            try {
                const earthquakeData = JSON.parse(data)[0];
                console.log('Received earthquake data:', earthquakeData);

                // 前回の地震情報と比較して変更があるか確認
                if (!isEqual(earthquakeData, previousEarthquakeData)) {
                    // 地震情報が変更された場合のみMisskeyに投稿
                    postToMisskey(earthquakeData);
                    // 変更された地震情報を保存
                    previousEarthquakeData = earthquakeData;
                } else {
                    console.log('No changes in earthquake data, skipping post');
                }
            } catch (error) {
                console.error('Failed to parse earthquake data:', error);
            }
        });
    }).on('error', (error) => {
        console.error('Error fetching earthquake data:', error);
    });
}

// 地震情報の比較関数
function isEqual(earthquake1: any, earthquake2: any): boolean {
    // 地震情報のJSON文字列を比較
    return JSON.stringify(earthquake1) === JSON.stringify(earthquake2);
}

// Misskeyに地震情報を投稿する関数
function postToMisskey(earthquakeData: any) {
    const earthquake = earthquakeData.earthquake;

    // 地震情報をわかりやすい形式に整形
    const message = `
        ミラです。地震が発生しました！\n
        日時: ${earthquake.time}\n
        震源地: ${earthquake.hypocenter.name}\n
        マグニチュード: ${earthquake.hypocenter.magnitude}\n
        受信時刻: ${earthquakeData.time}
    `;

    // Misskeyに投稿するデータの準備
    const postData = {
        visibility: 'public',
        text: message,
        localonly: 'true'
    };

    // MisskeyにPOSTリクエストを送信
    fetch(MISSKEY_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${MISSKEY_API_TOKEN}`
        },
        body: JSON.stringify(postData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to post to Misskey');
        }
        console.log('Posted to Misskey successfully');
    })
    .catch(error => {
        console.error('Error posting to Misskey:', error);
    });
}

// 地震情報の定期的な取得と処理を開始する
fetchAndProcessEarthquakeData();
