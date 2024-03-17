import https from 'https';
import dotenv from 'dotenv';

// .envファイルからトークンを読み込む
dotenv.config();
const MISSKEY_API_TOKEN = process.env.MISSKEY_API_TOKEN;

// p2pquakeのAPIエンドポイント
const P2PQUAKE_API_ENDPOINT = 'https://api.p2pquake.net/v2/history?codes=551&limit=1';

// MisskeyのAPIエンドポイント
const MISSKEY_API_ENDPOINT = 'https://freelynetwork.jp/api/notes/create';

// 前回の地震情報
let previousEarthquakeData: any = null;

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

                // 地震情報が更新された場合のみMisskeyに投稿
                if (!isEqual(earthquakeData)) {
                    postToMisskey(earthquakeData);
                    // 更新された地震情報を保存
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
function isEqual(newData: any): boolean {
    if (!previousEarthquakeData) {
        return false;
    }
    // 特定のフィールドの値を比較
    return (
        newData.earthquake.time === previousEarthquakeData.earthquake.time &&
        newData.earthquake.hypocenter.name === previousEarthquakeData.earthquake.hypocenter.name &&
        newData.earthquake.hypocenter.magnitude === previousEarthquakeData.earthquake.hypocenter.magnitude &&
        newData.time === previousEarthquakeData.time
    );
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
        text: message
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

// 1分ごとに地震データを取得して処理する
setInterval(fetchEarthquakeData, 60000);