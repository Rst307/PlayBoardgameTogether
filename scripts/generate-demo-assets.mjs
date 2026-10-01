import {deflateSync} from 'node:zlib';
import {existsSync,writeFileSync} from 'node:fs';
import {Buffer} from 'node:buffer';
import {URL} from 'node:url';

const directory=new URL('../games/test-counter/assets/',import.meta.url);
function crc32(bytes){let value=0xffffffff;for(const byte of bytes){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type,'ascii');const length=Buffer.alloc(4);length.writeUInt32BE(data.length);const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,checksum]);}
function png(){const header=Buffer.alloc(13);header.writeUInt32BE(1,0);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([0,49,92,75,255]))),chunk('IEND',Buffer.alloc(0))]);}
function wav(){const samples=800;const data=Buffer.alloc(samples*2);const header=Buffer.alloc(44);header.write('RIFF',0);header.writeUInt32LE(36+data.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(8000,24);header.writeUInt32LE(16000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(data.length,40);return Buffer.concat([header,data]);}
for(const [name,bytes] of [['token.png',png()],['add.wav',wav()]]){const target=new URL(name,directory);if(existsSync(target))throw new Error(`${name} already exists; refusing to overwrite`);writeFileSync(target,bytes);}
