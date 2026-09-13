import type {Profile,Project} from "./catalog";
export function mixProjects(items:Project[],profile:Profile,random= Math.random):Project[] {
  const shuffled=[...items];
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  const familiar=shuffled.filter(p=>profile.skills.includes(p.language));
  const fresh=shuffled.filter(p=>!profile.skills.includes(p.language));
  if(profile.discovery!=="mixed")return profile.discovery === "new" ? [...fresh,...familiar] : [...familiar,...fresh];
  const result:Project[]=[];
  for(let i=0;i<Math.max(familiar.length,fresh.length);i++){if(familiar[i])result.push(familiar[i]);if(fresh[i])result.push(fresh[i]);}
  return result;
}
