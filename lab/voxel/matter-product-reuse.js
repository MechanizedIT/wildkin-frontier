export function matterActorProductChanges(previousActors,nextActors,invalidatedIds=[]){
  const previous=new Map(previousActors.map(actor=>[actor.id,actor])),nextIds=new Set(nextActors.map(actor=>actor.id)),invalidated=new Set(invalidatedIds),prepare=[];
  for(const actor of nextActors){const old=previous.get(actor.id);
    if(!old||old.contentRevision!==actor.contentRevision||invalidated.has(actor.id))prepare.push(actor);
  }
  const retire=new Set(prepare.map(actor=>actor.id));for(const actor of previousActors)if(!nextIds.has(actor.id))retire.add(actor.id);
  return {prepare,retire:[...retire],reuse:nextActors.filter(actor=>previous.get(actor.id)?.contentRevision===actor.contentRevision&&!invalidated.has(actor.id)).map(actor=>actor.id)};
}
