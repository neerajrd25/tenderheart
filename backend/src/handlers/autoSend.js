import { autoSendDueReports } from '../services/autoSendService.js';

export async function handleAutoSend(event) {
  const summary = await autoSendDueReports(event.date);
  console.log('Auto-send summary:', JSON.stringify(summary));
  return summary;
}
