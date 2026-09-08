import type {Metadata} from 'next';
import './drafts.css';
export const metadata:Metadata={metadataBase:new URL('https://egregore.xyz'),title:'Cem’s drafts — Egregore',description:'Private working notes and editorial review.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
const restore=`try{var t=localStorage.getItem('cem-drafts-theme')||'auto';var dark=t==='dark'||(t==='auto'&&(matchMedia('(prefers-color-scheme: dark)').matches||(!matchMedia('(prefers-color-scheme: light)').matches&&(new Date().getHours()>=19||new Date().getHours()<7))));document.documentElement.dataset.theme=dark?'dark':'light';}catch{}`;
export default function DraftsLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:restore}}/></head><body>{children}</body></html>}
