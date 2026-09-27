export const Route = {
  library(folderId?: string) {
    return folderId ? `/folders/${folderId}` : "/";
  },
  drawing(id: string) {
    return `/drawings/${id}`;
  },
};
