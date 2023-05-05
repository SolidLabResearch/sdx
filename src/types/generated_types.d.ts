export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type RootQueryType = {
  __typename?: 'RootQueryType';
  contact?: Maybe<Contact>;
  contactCollection?: Maybe<Array<Maybe<Contact>>>;
  address?: Maybe<Address>;
  addressCollection?: Maybe<Array<Maybe<Address>>>;
  organization?: Maybe<Organization>;
  organizationCollection?: Maybe<Array<Maybe<Organization>>>;
};


export type RootQueryTypeContactArgs = {
  id?: InputMaybe<Scalars['String']>;
};


export type RootQueryTypeAddressArgs = {
  id?: InputMaybe<Scalars['String']>;
};


export type RootQueryTypeOrganizationArgs = {
  id?: InputMaybe<Scalars['String']>;
};

export type Contact = {
  __typename?: 'Contact';
  /** Auto-generated property that will be assigned to the `iri` of the Thing that is being queried. */
  id: Scalars['ID'];
  givenName: Scalars['String'];
  familyName: Scalars['String'];
  email?: Maybe<Array<Maybe<Scalars['String']>>>;
  address?: Maybe<Address>;
  worksFor?: Maybe<Array<Maybe<Organization>>>;
};

export type Address = {
  __typename?: 'Address';
  /** Auto-generated property that will be assigned to the `iri` of the Thing that is being queried. */
  id: Scalars['ID'];
  country: Scalars['String'];
  city: Scalars['String'];
  streetLine: Scalars['String'];
  postalCode: Scalars['String'];
};

export type Organization = {
  __typename?: 'Organization';
  /** Auto-generated property that will be assigned to the `iri` of the Thing that is being queried. */
  id: Scalars['ID'];
  name: Scalars['String'];
  address?: Maybe<Address>;
};
