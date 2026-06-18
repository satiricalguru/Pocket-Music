export interface AppReadyInfo {
  hasFfmpeg: boolean;
  pythonBin: string;
  baseUrl: string;
}

export interface AppErrorInfo {
  message: string;
}

export interface AppLoadingInfo {
  message: string;
}
