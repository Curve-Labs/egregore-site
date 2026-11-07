export type Draft={id:string;version:string;title:string;subtitle:string;category:string;readiness:string;sourceRange:string;why:string;sections:{heading:string;paragraphs:string[]}[];needsWork:string;counterpoint:string;sources:{date:string;label:string;quote:string;context:string}[]};
export type Review={draftId:string;draftVersion:string;status:string;revision:number;updatedAt:string};
export type Comment={id:string;draftId:string;body:string;createdAt:string};
export type Desk={drafts:Draft[];reviews:Review[];comments:Comment[];screening:{coverage:{label:string;value:string;detail:string}[];method:string[];held:{title:string;reason:string}[];limits:string[]}};
