import { BaseFactory, StringUtils } from '@open-test/playwright-core';

export interface SkillEntity {
  skillCode: string;
  name: string;
  category: string;
  level: string;
}

export class LxpSkillFactory extends BaseFactory<SkillEntity> {
  build(overrides: Partial<SkillEntity> = {}): SkillEntity {
    return {
      skillCode: overrides.skillCode ?? StringUtils.randomBusinessKey('SKL', 6),
      name: overrides.name ?? `Skill ${StringUtils.randomHex(4)}`,
      category: overrides.category ?? 'TECHNICAL',
      level: overrides.level ?? 'ADVANCED',
      ...overrides,
    };
  }

  async create(overrides: Partial<SkillEntity> = {}): Promise<SkillEntity> {
    return this.build(overrides);
  }
}
