/** Returns a repository identifier, or null for ordinary discovery keywords. */
export function repositoryInput(input:string):string|null {
  let value=input.trim();
  if (/^(https?:\/\/|www\.|github\.com\/)/i.test(value)) {
    if(!/^https?:\/\//i.test(value)) value="https://"+value;
    let url:URL;
    try {url=new URL(value);} catch {throw new Error("Enter a valid GitHub repository URL.");}
    if(!["github.com","www.github.com"].includes(url.hostname.toLowerCase()) || url.username || url.password || url.port) throw new Error("Use a github.com repository URL or owner/repository.");
    const parts=url.pathname.split("/").filter(Boolean);
    if(parts.length<2) throw new Error("Include both the owner and repository name.");
    value=parts.slice(0,2).join("/");
  } else if (!value.includes("/")) return null;
  value=value.replace(/\/$/,"").replace(/\.git$/i,"");
  if(!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}\/[a-zA-Z0-9_.-]+$/.test(value) || value.endsWith("/..") || value.endsWith("/.")) throw new Error("Enter a GitHub URL or owner/repository, such as grzdev/portfolio.");
  return value;
}
