import { expect, Assertion } from 'chai';
import { Msg_p, ClusterMessage, dataViewToHex } from '../uplift/cluster_message.js';

// Custom assertion method
Assertion.addMethod('trimEqual', function (expected) {
    const actual = this._obj;
    let _expected = (typeof expected === 'string') ? expected : dataViewToHex(expected);
    let _actual = (typeof actual === 'string') ? actual : dataViewToHex(actual);


    let esperanza = (_expected + '').replace(/\W/, '');
    let realidad = (_actual + '').replace(/\W/, '');

    this.assert(esperanza, realidad,
        `expected #{this} to be slightly equal to #{exp} within tolerance of #{act}`,
        `expected #{this} not to be slightly equal to #{exp} within tolerance of #{act}`,
        _expected,
        _actual
    );
});

// USAGE:
// npm install mocha chai --save-dev
// npx mocha test/cluster_message.test.js

//const raw_ints = [51, 51, 51, 51, 51, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 30, 100, 54, 61, 127, 128, 0, 112, 65, 177, 132, 60, 65, 177, 132, 60, 78, 151, 79, 65, 16, 19, 74, 90, 68, 0, 0, 0, 0, 141, 96, 78, 65, 0, 0, 228, 65];
const raw_ints = [51, 51, 51, 51, 51, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 30, 100, 54, 61, 127, 128, 0, 112, 65, 177, 4, 61, 65, 177, 132, 60, 147, 8, 85, 65, 16, 52, 49, 90, 68, 95, 168, 191, 67, 52, 187, 80, 65, 0, 0, 228, 65];
const raw_dv = new DataView(new Uint8Array(raw_ints).buffer);
const raw_hex = dataViewToHex(raw_dv);

describe('Msg_p', () => {
    it('should show raw', () => {
        let p = new Msg_p(raw_dv);
        let reconstructed = p.parts.reduce((acc, curr) => acc + dataViewToHex(curr), '');
        expect(reconstructed).to.trimEqual(raw_dv);
    });
    it('should show rawBody', () => {
        let p = new Msg_p(raw_dv);
        expect(p.rawBody()).to.trimEqual(new DataView(raw_dv.buffer, 24));
    });
    it('should respond with name and token', () => {
        let p = new Msg_p(raw_dv);
        expect('name: ' + p.getClassName()).to.equal('name: Msg_p');
        expect('token: ' + p.getClassToken()).to.equal('token: p');
        //expect(dataViewToHex(p.rawBody())).to.equal(dataViewToHex(raw_dv.buffer.slice(21, 300)));
    });
    it('should show temperature', () => {
        expect(new Msg_p(raw_dv).temperature()).to.equal(28.5);
    });
    it('should show 383 amps as 0 (fix bug on UI end)', () => {
        //hopefully new messages will not have 383 bug.
        expect(new Msg_p(raw_dv).amps()).to.equal(0);
    });

    it('should filter if a p-msg', () => {
        expect(Msg_p.filter()(raw_dv)).to.be.true;
    });
    it('should not filter if not a p-msg', () => {
        let non_p_dv = new DataView(new ArrayBuffer(53));
        expect(Msg_p.filter()(non_p_dv)).to.be.false;
    });
});