// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
'use strict';

module.exports = {
  parserOptions: {
    // __dirname locks tsconfig resolution to this file's directory,
    // regardless of the cwd of the ESLint process (fixes VS Code opening parent folder).
    tsconfigRootDir: __dirname,
    project: './tsconfig.json',
  },
  extends: ['@medplum/eslint-config'],
  root: true,
  settings: {
    // The import plugin resolves @medplum/* via node_modules → dist/ which is gitignored.
    // TypeScript already validates all @medplum imports via path aliases, so skip them here.
    'import/ignore': ['@medplum'],
  },
};
