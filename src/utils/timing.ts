export interface TimingResult {
  frontendDuration: number;
  backendDuration?: number;
  deepseekDuration?: number;
  businessDuration?: number;
  networkOverhead?: number;
}

export interface ApiResponse<T> {
  data: T;
  timing: TimingResult;
}

function getBottleneck(timing: TimingResult): string {
  if (!timing.backendDuration) return 'unknown';
  
  const backendTotal = timing.backendDuration;
  const deepseek = timing.deepseekDuration || 0;
  const business = timing.businessDuration || 0;
  const network = timing.networkOverhead || 0;
  
  if (deepseek > 0.8 * backendTotal) {
    return 'DeepSeek API is the bottleneck';
  } else if (business > 0.5 * backendTotal) {
    return 'Backend business logic is the bottleneck';
  } else if (network > backendTotal) {
    return 'Network/Frontend is the bottleneck';
  }
  return 'No clear bottleneck';
}

export async function callApiWithTiming<T>(
  name: string,
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const t0 = performance.now();
  
  console.log(`[${name}] 🚀 Request started at ${new Date().toISOString()}`);
  
  const response = await fetch(url, options);
  const result = await response.json() as T & { timing?: { backendDuration?: number; deepseekDuration?: number; businessDuration?: number } };
  
  const t1 = performance.now();
  const frontendDuration = t1 - t0;
  
  const timing: TimingResult = {
    frontendDuration,
    backendDuration: result.timing?.backendDuration,
    deepseekDuration: result.timing?.deepseekDuration,
    businessDuration: result.timing?.businessDuration,
  };
  
  if (timing.backendDuration) {
    timing.networkOverhead = frontendDuration - timing.backendDuration;
  }
  
  console.log(`[${name}] ✅ Response received`);
  console.log(`[${name}] ⏱️ Frontend total: ${frontendDuration.toFixed(0)}ms`);
  
  if (timing.backendDuration) {
    console.log(`[${name}] 📊 Breakdown:`);
    console.log(`  - Backend: ${timing.backendDuration.toFixed(0)}ms`);
    console.log(`  - DeepSeek: ${(timing.deepseekDuration || 0).toFixed(0)}ms`);
    console.log(`  - Business Logic: ${(timing.businessDuration || 0).toFixed(0)}ms`);
    console.log(`  - Network overhead: ${(timing.networkOverhead || 0).toFixed(0)}ms`);
    console.log(`[${name}] 🔍 ${getBottleneck(timing)}`);
  }
  
  return { data: result as T, timing };
}

export function logTiming(name: string, timing: TimingResult): void {
  console.log(`[${name}] 📈 Performance Summary:`);
  console.table({
    'Frontend Total': `${timing.frontendDuration.toFixed(0)}ms`,
    'Backend Total': timing.backendDuration ? `${timing.backendDuration.toFixed(0)}ms` : 'N/A',
    'DeepSeek API': timing.deepseekDuration ? `${timing.deepseekDuration.toFixed(0)}ms` : 'N/A',
    'Business Logic': timing.businessDuration ? `${timing.businessDuration.toFixed(0)}ms` : 'N/A',
    'Network Overhead': timing.networkOverhead ? `${timing.networkOverhead.toFixed(0)}ms` : 'N/A',
  });
}
