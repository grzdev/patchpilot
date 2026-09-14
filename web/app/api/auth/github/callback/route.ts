import {finishOAuth} from '@/lib/oauth';
export async function GET(request: Request) {
  return finishOAuth(request);
}

