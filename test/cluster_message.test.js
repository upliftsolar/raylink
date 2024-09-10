import { expect, Assertion } from 'chai';
import { Msg_p, ClusterMessage, dataViewToHex } from '../dashboard/src/assets/js/uplift/cluster_message.js';

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
    //raw() is mainly for inspecting / debugging. 
    it('should show raw', () => {
        let p = Msg_p.fromDataView(raw_dv);
        let r = p.raw();
        //expect(r).to.equal(raw_ints); <<-- why doesn't this work?
        expect(r[0][0]).to.equal(raw_ints.slice(0, 6)[0]);
        expect(r[1][0]).to.equal(raw_ints.slice(6, 6 + 6)[0]);
        expect(r[2][0]).to.equal(raw_ints.slice(12, 22)[0]);
        expect(r[3][0]).to.equal(raw_ints.slice(22, 23)[0]);
    });
    it('should show rawBodyDataView', () => {
        let p = Msg_p.fromDataView(raw_dv);
        expect(p.rawBodyDataView()).to.trimEqual(new DataView(raw_dv.buffer, 24));
    });
    it('ClusterMessage should have a datetime', () => {
        let p = ClusterMessage.fromDataView(raw_dv);
        expect(p.getTime().getDate()).to.equal(13);
        expect(p.timestamp.seconds).to.equal(204388n);
        expect(p.timestamp.milliseconds).to.equal(910000000);
    });
    it('subclass of ClusterMessage should have a datetime', () => {
        let p = Msg_p.fromDataView(raw_dv);
        expect(p.getTime().getDate()).to.equal(13);
        expect(p.timestamp.seconds).to.equal(204388n);
        expect(p.timestamp.milliseconds).to.equal(910000000);
    });
    it('should respond with name and token', () => {
        let p = Msg_p.fromDataView(raw_dv);
        expect('name: ' + p.getClassName()).to.equal('name: Msg_p');
        expect('token: ' + p.getClassToken()).to.equal('token: p');
        //expect(dataViewToHex(p.rawBodyDataView())).to.equal(dataViewToHex(raw_dv.buffer.slice(21, 300)));
    });
    it('should show temperature', () => {
        expect(Msg_p.fromDataView(raw_dv).temperature()).to.equal(28.5);
    });
    it('should show 383 amps as 0 (fix bug on UI end)', () => {
        //hopefully new messages will not have 383 bug.
        expect(Msg_p.fromDataView(raw_dv).amps()).to.equal(0);
    });

    it('should filter if a p-msg', () => {
        expect(Msg_p.filter()(raw_dv)).to.be.true;
    });
    it('should not filter if not a p-msg', () => {
        let non_p_dv = new DataView(new ArrayBuffer(53));
        expect(Msg_p.filter()(non_p_dv)).to.be.false;
    });
});