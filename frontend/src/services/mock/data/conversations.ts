import type { Conversation, Message } from '@/types/index.ts';

export const MOCK_MESSAGES: Message[] = [
  {
    message_id: 'msg-001',
    role: 'user',
    content: '有給休暇の申請方法を教えてください',
    input_method: 'text',
    created_at: '2026-02-14T09:00:00Z',
  },
  {
    message_id: 'msg-002',
    role: 'assistant',
    content: 'お疲れさまです。有給休暇の申請について確認しますね。\n\n社内の勤怠管理システムから申請できます。手順は以下の通りです：\n\n1. 勤怠システムにログイン\n2. 「休暇申請」メニューを選択\n3. 希望日と理由を入力して送信\n\n申請後は上長の承認を待ちます。もし不明な点があれば、人事チームにも確認できますよ。',
    input_method: 'text',
    created_at: '2026-02-14T09:00:05Z',
  },
  {
    message_id: 'msg-003',
    role: 'user',
    content: '承認までどのくらいかかりますか？',
    input_method: 'text',
    created_at: '2026-02-14T09:01:00Z',
  },
  {
    message_id: 'msg-004',
    role: 'assistant',
    content: '良いご質問ですね。\n\n通常、上長の承認は1〜2営業日程度で完了することが多いようです。ただ、繁忙期や上長の出張中などは少しお時間がかかる場合もあります。\n\nお急ぎの場合は、直接上長にお声がけいただくとスムーズかもしれません。',
    input_method: 'text',
    created_at: '2026-02-14T09:01:05Z',
  },
];

const MOCK_MESSAGES_CONV2: Message[] = [
  {
    message_id: 'msg-011',
    role: 'user',
    content: '社内ポータルの使い方を教えてください',
    input_method: 'text',
    created_at: '2026-02-13T10:15:00Z',
  },
  {
    message_id: 'msg-012',
    role: 'assistant',
    content: 'もちろんです。社内ポータルについてご案内しますね。\n\nブラウザでportal.example.comにアクセスし、社員IDとパスワードでログインします。\n\nよく使うメニューとしては：\n- 「お知らせ」：全社連絡事項\n- 「各種申請」：休暇・経費等の申請\n- 「社内検索」：規程・マニュアル検索\n\nブックマークしておくと便利ですよ。',
    input_method: 'text',
    created_at: '2026-02-13T10:15:08Z',
  },
  {
    message_id: 'msg-013',
    role: 'user',
    content: 'パスワードを忘れた場合はどうすればいいですか？',
    input_method: 'text',
    created_at: '2026-02-13T10:16:00Z',
  },
  {
    message_id: 'msg-014',
    role: 'assistant',
    content: 'なるほど、それは困りますよね。\n\nログイン画面の「パスワードを忘れた方」リンクから再設定できます。社員メールアドレスを入力すると、リセット用のメールが届きます。\n\nもしメールも届かない場合は、IT部門のヘルプデスク（内線: 1234）に連絡すると対応してもらえますよ。',
    input_method: 'text',
    created_at: '2026-02-13T10:16:06Z',
  },
  {
    message_id: 'msg-015',
    role: 'user',
    content: 'ありがとうございます！',
    input_method: 'text',
    created_at: '2026-02-13T10:17:00Z',
  },
  {
    message_id: 'msg-016',
    role: 'assistant',
    content: 'いえいえ、お役に立てて嬉しいです。\n\n他にもわからないことがあれば、いつでも気軽に聞いてくださいね。応援しています！',
    input_method: 'text',
    created_at: '2026-02-13T10:17:04Z',
  },
];

const MOCK_MESSAGES_CONV3: Message[] = [
  {
    message_id: 'msg-021',
    role: 'user',
    content: '研修スケジュールを確認したいのですが',
    input_method: 'text',
    created_at: '2026-02-12T09:30:00Z',
  },
  {
    message_id: 'msg-022',
    role: 'assistant',
    content: 'お疲れさまです。研修スケジュールの確認ですね。\n\n研修スケジュールは社内ポータルの「研修・教育」セクションで確認できます。また、入社時にお渡しした研修ガイドにも記載がございます。\n\n具体的な研修名やお日にちが知りたい場合は、研修チームの担当者に直接お問い合わせいただくのが確実です。',
    input_method: 'text',
    created_at: '2026-02-12T09:30:07Z',
  },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    conversation_id: 'conv-001',
    title: '有給休暇の申請方法について',
    created_at: '2026-02-14T09:00:00Z',
    updated_at: '2026-02-14T09:01:05Z',
    messages: MOCK_MESSAGES,
  },
  {
    conversation_id: 'conv-002',
    title: '社内ポータルの使い方',
    created_at: '2026-02-13T10:15:00Z',
    updated_at: '2026-02-13T10:17:04Z',
    messages: MOCK_MESSAGES_CONV2,
  },
  {
    conversation_id: 'conv-003',
    title: '研修スケジュールの確認',
    created_at: '2026-02-12T09:30:00Z',
    updated_at: '2026-02-12T09:30:07Z',
    messages: MOCK_MESSAGES_CONV3,
  },
];
