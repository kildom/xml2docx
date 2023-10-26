
export interface ReadOnlyList<T> {
};

export interface MutableList<T> {
};

export class DatabaseDate {

};

export class DatabaseRow {
    get isDirty(): boolean {};
    apply(): void {};
};

export interface Database {

    getZlecenia(zleceniodawca: Zleceniodawca): DatabaseList<Zlecenie>;
    getZlecenia(): DatabaseList<Zlecenie>;

    add(zlecenie: Zlecenie);
    add(zleceniodawca: Zleceniodawca);

};

export class Zlecenie extends DatabaseRow {

    static get(zleceniodawca: Zleceniodawca): ReadOnlyList<Zlecenie>;
    static get(id: number): Zlecenie | null;
    static get(): ReadOnlyList<Zlecenie>;
    static get(...args:any[]): ReadOnlyList<Zlecenie> | Zlecenie | null { }

    get id(): number | undefined {}

    zleceniodawca: Zleceniodawca;
    dataPrzyjecia: DatabaseDate | null;
    dataZwrotu: DatabaseDate | null;
    formaPrzyjecia: string;
    formaZwrotu: string;
    get kartyPrzyjecia(): MutableList<KartaPrzyjecia> {}
};

export interface ZleceniodawcaFields {
    id?: string;
    nazwa: string;
    adres: string;
    osobaKontaktowa: string;
    telefon: string;
    fax: string;
    email: string;
    uwagi: string;
    rabat: string;
    nip: string;
    ifj: boolean;
};

export class Zleceniodawca extends DatabaseRow {
    get id(): number | null {}
    nazwa: string;
    adres: string;
    osobaKontaktowa: string;
    telefon: string;
    fax: string;
    email: string;
    uwagi: string;
    rabat: string;
    nip: string;
    ifj: boolean;
};

export class KartaPrzyjecia {

};


enum RowState {
    
};
