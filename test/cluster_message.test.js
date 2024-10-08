import { expect, Assertion } from 'chai';
import { Msg_p, Msg_m, ClusterMessage, dataViewToHex } from '../dashboard/src/assets/js/uplift/cluster_message.js';

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

const raw_ints = [51, 51, 51, 51, 51, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 30, 100, 54, 61, 127, 128, 0, 112, 65, 177, 4, 61, 65, 177, 132, 60, 147, 8, 85, 65, 16, 52, 49, 90, 68, 95, 168, 191, 67, 52, 187, 80, 65, 0, 0, 228, 65];
const raw_dv = new DataView(new Uint8Array(raw_ints).buffer);
const raw_hex = dataViewToHex(raw_dv);

describe('Msg_p', () => {
    // Raw data test for Msg_p
    it('should show raw', () => {
        let p = Msg_p.fromDataView(raw_dv);
        let r = p.raw();
        expect(r[0][0]).to.equal(raw_ints.slice(0, 6)[0]);
        expect(r[1][0]).to.equal(raw_ints.slice(6, 6 + 6)[0]);
        expect(r[2][0]).to.equal(raw_ints.slice(12, 22)[0]);
        expect(r[3][0]).to.equal(raw_ints.slice(22, 23)[0]);
    });

    // More test cases for Msg_p...
});

// New test cases for Msg_m
describe('Msg_m', () => {
    const raw_ints_m = [51, 51, 51, 51, 51, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 109, 30, 100, 54, 61, 127, 128, 0, 112, 65, 177, 4, 61, 65, 177, 132, 60, 147, 8, 85, 65, 16, 52, 49, 90, 68, 95, 168, 191, 67, 52, 187, 80, 65, 0, 0, 228, 65];
    const raw_dv_m = new DataView(new Uint8Array(raw_ints_m).buffer);

    it('should show raw for Msg_m', () => {
        let m = Msg_m.fromDataView(raw_dv_m);
        let r = m.raw();
        expect(r[0][0]).to.equal(raw_ints_m.slice(0, 6)[0]);
        expect(r[1][0]).to.equal(raw_ints_m.slice(6, 6 + 6)[0]);
        expect(r[2][0]).to.equal(raw_ints_m.slice(12, 22)[0]);
        expect(r[3][0]).to.equal(raw_ints_m.slice(22, 23)[0]);
    });

    it('should show rawBodyDataView for Msg_m', () => {
        let m = Msg_m.fromDataView(raw_dv_m);
        expect(m.rawBodyDataView()).to.trimEqual(new DataView(raw_dv_m.buffer, 24));
    });

    it('ClusterMessage should have a datetime for Msg_m', () => {
        let m = ClusterMessage.fromDataView(raw_dv_m);
        expect(m.getTime().getDate()).to.equal(13);
        expect(m.timestamp.seconds).to.equal(204388n);
        expect(m.timestamp.milliseconds).to.equal(910000000);
    });

    it('should respond with name and token for Msg_m', () => {
        let m = Msg_m.fromDataView(raw_dv_m);
        expect('name: ' + m.getClassName()).to.equal('name: Msg_m');
        expect('token: ' + m.getClassToken()).to.equal('token: m');
    });

    it('should filter if an m-msg', () => {
        expect(Msg_m.filter()(raw_dv_m)).to.be.true;
    });

    it('should not filter if not an m-msg', () => {
        let non_m_dv = new DataView(new ArrayBuffer(53));
        expect(Msg_m.filter()(non_m_dv)).to.be.false;
    });
});
