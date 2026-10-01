import {describe,expect,it} from 'vitest';
import {mergeRoomSnapshot} from '../../apps/web/src/pages/roomSnapshot.js';

describe('room snapshot ordering',()=>{
  it('does not let a delayed HTTP response overwrite a newer WS revision',()=>{
    const newer={roomRevision:4,name:'newer'};
    const older={roomRevision:3,name:'older'};
    expect(mergeRoomSnapshot(newer,older)).toBe(newer);
    expect(mergeRoomSnapshot(older,newer)).toBe(newer);
    expect(mergeRoomSnapshot(undefined,newer)).toBe(newer);
  });
});
