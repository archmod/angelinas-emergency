// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'dev-dist/**', 'node_modules/**', 'scripts/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/core/**/*.ts', 'test/**/*.ts'],
    rules: {
      // src/core is pure game logic: it must stay Phaser-free so it runs in Vitest (node) and stays portable.
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'phaser', message: 'src/core must not import Phaser. Put engine code under src/game.' }],
          patterns: [{ group: ['**/game/**', '@/game/**'], message: 'src/core must not depend on src/game.' }],
        },
      ],
    },
  },
);
