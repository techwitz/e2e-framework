import { BaseTask } from '@open-test/playwright-core';
import { CatalogPage } from '../../pages/index.js';

export interface SearchCatalogInput {
  searchTerm: string;
}

export class SearchCatalogTask extends BaseTask<SearchCatalogInput, void> {
  async performAs({ searchTerm }: SearchCatalogInput): Promise<void> {
    const catalog = new CatalogPage(this.page);
    await catalog.navigate();
    await catalog.searchCourse(searchTerm);
  }
}
