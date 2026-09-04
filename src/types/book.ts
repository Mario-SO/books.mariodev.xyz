export type ReadingStatus = 'unread' | 'reading' | 'finished';
export type BookGenre = 'science-fiction' | 'fantasy' | 'nonfiction';

export interface Book {
	id: number;
	slug: string;
	title: string;
	author: string;
	genre?: BookGenre;
	publicationYear: number;
	synopsis: string;
	status: ReadingStatus;
	pagesRead: number;
	pageCount: number;
	startedAt: string | null;
	finishedAt: string | null;
	cover: string;
	series?: string;
	seriesOrder?: number;
	coverColor?: string;
	spineColor?: string;
	pageColor?: string;
}

export interface BookCatalogue {
	placeholderData: boolean;
	books: Book[];
}
