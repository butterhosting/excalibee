create table drawing_content (
    drawing_id text primary key references drawing(id) on delete cascade,
    scene text not null,
    thumbnail blob
);
