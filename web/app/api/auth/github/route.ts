import {startOAuth} from '@/lib/oauth';
export async function GET(request: Request) {
  return startOAuth(request);
}

