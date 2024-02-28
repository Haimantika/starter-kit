import { addPublicationJsonLd } from '@starter-kit/utils/seo/addPublicationJsonLd';
import { getAutogeneratedPublicationOG } from '@starter-kit/utils/social/og';
import request from 'graphql-request';
import { GetStaticProps } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import { Waypoint } from 'react-waypoint';
import { Container } from '../components/container';
import { AppProvider } from '../components/contexts/appContext';
import { Footer } from '../components/footer';
import { Layout } from '../components/layout';
import { MinimalPosts } from '../components/minimal-posts';
import { PersonalHeader } from '../components/personal-theme-header';
import {
	MorePostsByPublicationDocument,
	MorePostsByPublicationQuery,
	MorePostsByPublicationQueryVariables,
	PageInfoFragment,
	PostFragment,
	PostsByPublicationDocument,
	PostsByPublicationQuery,
	PostsByPublicationQueryVariables,
	PublicationFragment,
} from '../generated/graphql';

const GQL_ENDPOINT = process.env.NEXT_PUBLIC_HASHNODE_GQL_ENDPOINT;

type Props = {
	publication: PublicationFragment;
	initialPosts: PostFragment[];
	initialPageInfo: PageInfoFragment;
};

export default function Index({ publication, initialPosts, initialPageInfo }: Props) {
	const [posts, setPosts] = useState<PostFragment[]>(initialPosts);
	const [pageInfo, setPageInfo] = useState<Props['initialPageInfo']>(initialPageInfo);
	const [loadedMore, setLoadedMore] = useState(false);

	const loadMore = async () => {
		const data = await request<MorePostsByPublicationQuery, MorePostsByPublicationQueryVariables>(
			GQL_ENDPOINT,
			MorePostsByPublicationDocument,
			{
				first: 20,
				host: process.env.NEXT_PUBLIC_HASHNODE_PUBLICATION_HOST,
				after: pageInfo.endCursor,
			},
		);
		if (!data.publication) {
			return;
		}
		const newPosts = data.publication.posts.edges.map((edge) => edge.node);
		setPosts([...posts, ...newPosts]);
		setPageInfo(data.publication.posts.pageInfo);
		setLoadedMore(true);
	};
	return (
		<AppProvider publication={publication}>
			<Layout>
			<Head>
				<title>{publication.title}</title>
				<meta name="description" content={publication.descriptionSEO || publication.title} />
				<meta property="twitter:card" content="summary_large_image" />
				<meta property="twitter:title" content={publication.displayTitle || publication.title || 'Hashnode Blog Starter Kit'} />
				<meta property="twitter:description" content={publication.descriptionSEO || publication.title} />
				<meta property="og:image" content={publication.ogMetaData.image || getAutogeneratedPublicationOG(publication)} />
				<meta property="twitter:image" content={publication.ogMetaData.image || getAutogeneratedPublicationOG(publication)} />
				<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(addPublicationJsonLd(publication)) }} />
				</Head>

				<Container className="mx-auto flex max-w-3xl flex-col items-stretch gap-10 px-5 py-10">
					<PersonalHeader />
					
					{posts.length > 0 && <MinimalPosts context="home" posts={posts} />}
					{!loadedMore && pageInfo.hasNextPage && pageInfo.endCursor && (
						<button className="bg-white" onClick={loadMore}>
							Load more
						</button>
					)}
					{loadedMore && pageInfo.hasNextPage && pageInfo.endCursor && (
						<Waypoint onEnter={loadMore} bottomOffset={'10%'} />
					)}

					<Footer />
				</Container>
			</Layout>
		</AppProvider>
	);
}

export const getStaticProps: GetStaticProps<Props> = async () => {
	const data = await request<PostsByPublicationQuery, PostsByPublicationQueryVariables>(
		GQL_ENDPOINT,
		PostsByPublicationDocument,
		{
			first: 20,
			host: process.env.NEXT_PUBLIC_HASHNODE_PUBLICATION_HOST,
		},
	);

	const publication = data.publication;
	if (!publication) {
		return {
			notFound: true,
		};
	}
	const initialPosts = (publication.posts.edges ?? []).map((edge) => edge.node);

	return {
		props: {
			publication,
			initialPosts,
			initialPageInfo: publication.posts.pageInfo,
		},
		revalidate: 1,
	};
};
