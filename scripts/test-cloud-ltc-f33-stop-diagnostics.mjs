import test from 'node:test';import assert from 'node:assert/strict';
import {safeRetirementFailure} from './cloud-ltc-f33-retirement-cli.mjs';
test('diagnostic permits only literal codes and never evaluates getters or leaks payload',()=>{
 for(const code of ['f33_stop_job','retirement_native_job_status','retirement_github_read_unconfirmed'])assert.equal(safeRetirementFailure(Error(code)),code);
 for(const error of [Error('f33_stop_job secret'),Error('PRIVATE https://example.com/token'),{get message(){throw Error('PRIVATE');}},new Proxy({}, {getOwnPropertyDescriptor(){throw Error('PRIVATE');}})])assert.equal(safeRetirementFailure(error),'paused_retirement_blocked');
});
