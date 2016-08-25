/*
CREATE DATABASE CARTLAB;
CREATE USER cartLabUser;
ALTER USER cartLabUser with password 'R0b1ns0n!';
GRANT ALL PRIVILEGES on cartlab to cartLabUser;
*/

DROP TABLE IF EXISTS Authors cascade;
DROP TABLE IF EXISTS Authorship cascade;
DROP TABLE IF EXISTS ObjectReferences cascade;
DROP TABLE IF EXISTS Resources cascade;
DROP TABLE IF EXISTS ObjectTypes cascade;
DROP TABLE IF EXISTS Tags cascade;
DROP TABLE IF EXISTS Categories cascade;
DROP TABLE IF EXISTS AuthUser cascade;
DROP Table IF EXISTS AuthUsers cascade;
DROP TABLE IF EXISTS ObjectTypes cascade;
DROP TABLE IF EXISTS MediaTypes cascade;
DROP TABLE IF Exists Sessions cascade;
DROP TABLE IF EXISTS CallLog cascade;
DROP TABLE IF EXISTS AuthActions cascade;

CREATE TABLE AuthUsers (
	UserID serial primary key,
	UserFirst text,
	UserLast text,
	UserEmail text,
	AdminPassword text,
	Approved boolean,
	Modified timestamp default current_timestamp
);

CREATE TABLE AuthActions(
	ActionID serial primary key,
	resourceID integer,
	resourceType text,
	userID integer,
	approved boolean,
	modified timestamp default current_timestamp
);

CREATE TABLE callLog (
	CallID serial primary key,
	ResourceEndpoint text,
	Method text,
	RemoteIP text,
	QueryParameters text,
	UserAgent text,
	ResponseCode integer,
	CallTime timestamp default current_timestamp,
	Protocol text,
	sessionID text,
	sessionUser text,
	hostname text
);


CREATE TABLE Authorship(
	AuthorshipID serial primary key,
	ResourceID integer,
	AuthorFirst text,
	AuthorLast text,
	AuthorMiddle text,
	Modified timestamp default current_timestamp
);

CREATE TABLE Resources(
	ResourceID serial primary key,
	ResourceName text,
	ResourceTitle text,
	ResourceDate date,
	ResourceCategory integer,
	ResourceDescription text,
	Notes text,
	EmbargoStatus boolean,
	EmbargoAuth integer,
	ObjectReference text,
	ObjectType integer,
	ObjectSize bigint,
	UploaderName text,
	UploaderEmail text,
	Rejected boolean default FALSE,
	Modified timestamp default current_timestamp
);

CREATE TABLE Tags(
	TagID serial primary key,
	ResourceID integer,
	TagText text,
	Modified timestamp default current_timestamp
);
CREATE TABLE Categories(
	CategoryID serial primary key,
	CategoryText text,
	HigherCategory text,
	Modified timestamp default current_timestamp
);

CREATE TABLE ObjectReferences(
	ReferenceID serial primary key,
	ResourceID integer,
	Authors text,
	Title text,
	Journal text,
	Place text,
	Volume text,
	Issue text,
	Pages text,
	PubYear integer,
	Publisher text,
	DOI text,
	TypeOfReference text,
	rawRef text,
	Modified timestamp default current_timestamp
);

CREATE TABLE MediaTypes(
	MediaTypeID serial primary key,
	mimeType text,
	description text,
	allowed boolean,
	modified timestamp default current_timestamp
);

ALTER TABLE Resources ADD FOREIGN KEY (ResourceCategory) REFERENCES Categories on delete cascade;
ALTER TABLE Resources ADD FOREIGN KEY (EmbargoAuth) REFERENCES AuthUsers on delete cascade;
ALTER TABLE Tags ADD FOREIGN KEY (ResourceID) REFERENCES Resources on delete cascade;
ALTER TABLE ObjectReferences ADD FOREIGN KEY (ResourceID) REFERENCES Resources on delete cascade;
ALTER TABLE Resources ADD FOREIGN KEY (ObjectType) REFERENCES MediaTypes on delete cascade;
ALTER TABLE Authorship ADD FOREIGN KEY (ResourceID) REFERENCES Resources on delete cascade;

INSERT INTO AuthUsers Values(default, 'Scott', 'Farley','sfarley2@wisc.edu', '', default);

INSERT INTO Categories Values(default, 'project', '', default);
INSERT INTO Categories Values(default, 'ed/370', 'ed', default);
INSERT INTO Categories Values(default, 'ed/572', 'ed', default);
INSERT INTO Categories Values(default, 'ed/575', 'ed', default);
INSERT INTO Categories Values(default, 'ed/970', 'ed', default);
INSERT INTO Categories Values(default, 'news/blog', 'news', default);
INSERT INTO Categories Values(default, 'research/paper', 'research', default);
INSERT INTO Categories Values(default, 'research/poster', 'research',default);
INSERT INTO Categories Values(default, 'research/slides', 'research',default);
INSERT INTO Categories Values(default, 'design/map', 'design', default);
INSERT INTO Categories Values(default, 'design/interactive','design', default);
INSERT INTO Categories Values(default, 'design/document', 'design', default);
INSERT INTO Categories Values(default, 'design/image', 'design', default);
INSERT INTO Categories Values(default, 'design/data', 'design', default);
INSERT INTO Categories Values(default, 'uncategorized', '', default);

INSERT INTO MediaTypes VALUES (default, 'application/pdf', 'PDF Document', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'video/x-msvideo', 'AVI Audio', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'image/bmp', 'Bitmap Image', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'video/x-f4v', 'Flash Video', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'video/x-flv', 'Flash Video', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'image/gif', 'GIF Image', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'text/html', 'HTML Document', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'text/css', 'CSS Stylesheet', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/javascript', 'Javascript Source', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'imaage/jpeg', 'JPEG Image', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/json', 'JSON Data', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/x-latex', 'Latex File', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/x-msaccess', 'Microsoft Access Database', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/vnd.ms-excel', 'Microsoft Excel Document', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/vnd.ms-powerpoint', 'Microsoft Powerpoint Document', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/ms-word', 'Microsoft Word Document', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'audio/mpeg', 'MPEG Audio', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'video/mp4', 'MP4 Video', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'audio/mp4', 'MP4 Audio', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/mp4', 'MP4 Video', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'image/vnd.adobe.photoshop', 'Photoshop Document', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'image/png', 'Portable Network Graphics (PNG) Image', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/rtf', 'Rich Text', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'text/tab-separated-values', 'Tab Separated Values Data', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'text/csv', 'Comma Separated Values Data', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'text/plain', 'Plain Text', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/x-font-ttf', 'TrueType Font', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'audio/x-wav', 'WAV audio', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/x-font-woff', 'Web Open Font', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/xml', 'CML Data', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/xhtml+xml', 'XHTML', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/zip', 'ZIP Archive', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/illustrator', 'Illustrator Document', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/octet-stream', 'Binary Data', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/vnd.geo+json', 'GeoJSON Data', TRUE, default);
INSERT INTO MediaTypes VALUES (Default, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'MS Word [.docx])', TRUE, default);
INSERT INTO MediaTypes VALUES (default, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'Powerpoint Presentation [.pptx]', TRUE, default);
