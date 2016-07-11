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

CREATE TABLE Authors (
	AuthorID serial primary key,
	AuthorFirst text,
	AuthorLast text,
	AuthorMiddle text,
	AuthorEmail text,
	AdminStatus boolean,
	AdminPassword text,
	Modified timestamp default current_timestamp
);

CREATE TABLE Authorship(
	AuthorshipID serial primary key,
	ResourceID integer,
	AuthorID integer,
	Modified timestamp default current_timestamp
);

CREATE TABLE Resources(
	ResourceID integer primary key,
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
	Modified timestamp default current_timestamp
);

CREATE TABLE ObjectTypes(
	ObjectTypeID serial primary key,
	Description  text,
	MIMEType text,
	Modified timestamp default current_timestamp
);

ALTER TABLE Resources ADD FOREIGN KEY (ResourceCategory) REFERENCES Categories on delete cascade;
ALTER TABLE Resources ADD FOREIGN KEY (EmbargoAuth) REFERENCES Authors on delete cascade;
ALTER TABLE Tags ADD FOREIGN KEY (ResourceID) REFERENCES Resources on delete cascade;
ALTER TABLE ObjectReferences ADD FOREIGN KEY (ResourceID) REFERENCES Resources on delete cascade;
ALTER TABLE Resources ADD FOREIGN KEY (ObjectType) REFERENCES ObjectTypes on delete cascade;
ALTER TABLE Authorship ADD FOREIGN KEY (ResourceID) REFERENCES Resources on delete cascade;
ALTER TABLE Authorship ADD FOREIGN KEY (AuthorID) REFERENCES Authors on delete cascade;

	
	