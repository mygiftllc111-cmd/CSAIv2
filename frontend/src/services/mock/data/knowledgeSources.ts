import type { KnowledgeSource } from '@/types/index.ts';

export const MOCK_KNOWLEDGE_SOURCES: KnowledgeSource[] = [
  {
    source_id: 'ks-001',
    type: 'notion',
    connection_config: {
      integration_token: '••••••••••••noti_xxx',
      target_pages: 'ワークスペース全体',
    },
    sync_interval_minutes: 60,
    last_synced_at: '2026-02-14T08:00:00Z',
    document_count: 47,
    status: 'active',
  },
  {
    source_id: 'ks-002',
    type: 'google_drive',
    connection_config: {
      service_account: '••••••••@project.iam.gserviceaccount.com',
      target_folder: '社内マニュアル / 研修資料',
    },
    sync_interval_minutes: 120,
    last_synced_at: '2026-02-14T06:00:00Z',
    document_count: 23,
    status: 'active',
  },
];
