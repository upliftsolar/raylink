import { expect } from 'chai';
import p_msg from '../uplift/cluster_message.js';

//USAGE:
//npm install mocha chai --save-dev
const raw_msg = DataView(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42);

describe('p_msg', () => {
    it('should ', () => {
        expect(p_msg(raw_msg).rawBody()).to.equal(raw_msg.slice(21, 300));
    });

    it('should filter if a p-msg', () => {
        expect(p_msg.filter()(raw_msg)).to.equal(21);
    });
    it('should not filter if not a p-msg', () => {
        expect(p_msg.filter()(raw_msg)).to.equal(21);
    });
});