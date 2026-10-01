export function mergeRoomSnapshot<T extends {roomRevision:number}>(current:T|undefined,incoming:T):T{
  return !current||incoming.roomRevision>=current.roomRevision?incoming:current;
}
