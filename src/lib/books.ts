import catalogueJson from '../data/books.json';
import type { Book, BookCatalogue } from '../types/book';

const catalogue = catalogueJson as BookCatalogue;

if (catalogue.books.length !== 30) {
	throw new Error(`The book gallery requires exactly 30 books; found ${catalogue.books.length}.`);
}

const slugs = new Set(catalogue.books.map((book) => book.slug));
if (slugs.size !== catalogue.books.length) {
	throw new Error('Every book in src/data/books.json must have a unique slug.');
}

const authorOrder = new Map<string, number>();
for (const book of catalogue.books) {
	if (!authorOrder.has(book.author)) authorOrder.set(book.author, authorOrder.size);
}

function gallerySection(book: Book): number {
	return book.genre === 'science-fiction' || book.genre === 'fantasy' ? 0 : 1;
}

export const books: Book[] = [...catalogue.books].sort((a, b) =>
	(gallerySection(a) - gallerySection(b))
	|| (authorOrder.get(a.author)! - authorOrder.get(b.author)!)
	|| ((a.seriesOrder ?? Number.MAX_SAFE_INTEGER) - (b.seriesOrder ?? Number.MAX_SAFE_INTEGER))
	|| (a.publicationYear - b.publicationYear)
	|| (a.id - b.id)
);
export const usesPlaceholderData = catalogue.placeholderData;

export function getProgress(book: Book): number {
	if (!Number.isFinite(book.pageCount) || book.pageCount <= 0) return 0;
	return Math.min(100, Math.max(0, Math.round((book.pagesRead / book.pageCount) * 100)));
}

export function getBookBySlug(slug: string): Book | undefined {
	return books.find((book) => book.slug === slug);
}
