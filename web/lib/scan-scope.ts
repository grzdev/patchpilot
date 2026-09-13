export function normalizeScope(value:string) {
  const scope=value.trim().replace(/^\/+|\/+$/g,"");
  if(scope.split("/").some(part=>part === "." || part === "..")) throw new Error("Choose a folder within the repository.");
  return scope;
}
export function inScope(path:string,scope:string) { return !scope || path === scope || path.startsWith(scope+"/"); }
export function folderOptions(files:{path:string}[]) {
  const counts=new Map<string,number>();
  for(const file of files) {
    const parts=file.path.split("/");parts.pop();
    for(let depth=1;depth<=parts.length;depth++) {
      const folder=parts.slice(0,depth).join("/");counts.set(folder,(counts.get(folder)||0)+1);
    }
  }
  return [...counts].sort(([a],[b])=>a.localeCompare(b)).map(([path,count])=>({path,count}));
}
