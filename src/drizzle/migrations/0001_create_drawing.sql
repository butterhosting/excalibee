create table drawing (
    id text primary key,
    folder_id text references folder(id) on delete cascade,
    name text not null,
    search_text text not null default '',
    created text not null,
    updated text
);
--> statement-breakpoint
create index drawing_folder_idx on drawing(folder_id);
--> statement-breakpoint
create unique index drawing_name_idx on drawing(coalesce(folder_id, ''), name collate nocase);
