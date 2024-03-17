import WebSocket from 'ws';

// p2pquakeのWebSocketエンドポイント
const P2PQUAKE_WEBSOCKET_ENDPOINT = 'wss://api.p2pquake.net/v1/stream/lastquake';

// MisskeyのAPIエンドポイントとトークン
const MISSKEY_API_ENDPOINT = 'https://freelynetwork.jp/api/notes/create';
const MISSKEY_API_TOKEN = 'YOUR-TOKEN';

// 起動時刻を記録する変数
let startTime: number;

// WebSocketクライアントの作成
const ws = new WebSocket(P2PQUAKE_WEBSOCKET_ENDPOINT);

// WebSocket接続が確立されたときの処理
ws.on('open', () => {
    console.log('Connected to p2pquake WebSocket');

    // 起動時刻を記録
    startTime = Date.now();
});

// メッセージ受信時の処理
ws.on('message', (data: string) => {
    // 受信したデータを解析して必要な情報を取得
    const earthquakeData = JSON.parse(data);

    // 地震が起動時刻以前に発生した場合はスキップ
    if (earthquakeData.time < startTime) {
        console.log('Skipped earthquake occurred before startup');
        return;
    }

    // 取得した地震情報をMisskeyに投稿
    postToMisskey(earthquakeData);
});

// Misskeyに地震情報を投稿する関数
function postToMisskey(earthquakeData: any) {
    // Misskeyに投稿するデータの準備
    const postData = {
        visibility: 'public',
        text: `地震が発生しました！\n震度: ${earthquakeData.scaledIntensity}, ${earthquakeData.area}`
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
