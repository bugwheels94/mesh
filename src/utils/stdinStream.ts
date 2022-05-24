'use strict';

import cloneable from 'cloneable-readable';
// import pump from 'pump';

const stream = cloneable(process.stdin);

export const getProcessStdin = () => stream.clone();
// pump(stream.clone(), fs.createWriteStream('./out1'));
