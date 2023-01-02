const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const { GraphQLObjectType, GraphQLSchema, GraphQLString, GraphQLBoolean, GraphQLInt } = require('graphql')
const { attachPaginate } = require('knex-paginate')

const pg = require('knex')({
    client: "pg",
    connection: process.env.PG_CONNECTION_STRING,
    searchPath: ['knex', 'public'],
});

attachPaginate()

const MerchantType = new GraphQLObjectType({
    name: 'merchant',
    fields: () => ({
        id: {
            type: GraphQLInt,
        },
        merchant_name: {
            type: GraphQLString,
        },
        phone_number: {
            type: GraphQLString,
        },
        latitude: {
            type: GraphQLString,
        },
        longitude: {
            type: GraphQLString,
        },
        is_active: {
            type: GraphQLBoolean,
        },
        datetime: {
            type: GraphQLString,
        },
    }),
});

const QueryRoot = new GraphQLObjectType({
    name: 'Query',
    fields: () => ({
        getMerchant: {
            type: MerchantType,
            args: {
                id: {
                    type: GraphQLInt
                }
            },
            resolve: async (parent, args) => {
                return pg('merchant').where({id: args.id}).first()
            }
        },
        getAllMerchant: {
            type: MerchantType,
            args: {
                orderBy: {
                    type: GraphQLString
                },
                page: {
                    type: GraphQLInt
                }
            },
            resolve: async (parent, args) => {
                return pg('merchant').select().orderBy(args.orderBy).paginate({ perPage: 10, currentPage: Number(args.page) })
            }
        }
    })
})

const MutationRoot = new GraphQLObjectType({
    name: 'Mutation',
    fields: () => ({
        createMerchant: {
            type: MerchantType,
            args: {
                merchant_name: {
                    type: GraphQLString
                },
                phone_number: {
                    type: GraphQLString
                },
                latitude: {
                    type: GraphQLString
                },
                longitude: {
                    type: GraphQLString
                }
            },
            resolve: async (parent, args) => {
                return pg('merchant').insert({...args, datetime: Date.now()}).returning('*')
            }
        },
        updateMerchant: {
            type: MerchantType,
            args: {
                id: {
                    type: GraphQLInt
                },
                merchant_name: {
                    type: GraphQLString
                },
                phone_number: {
                    type: GraphQLString
                },
                latitude: {
                    type: GraphQLString
                },
                longitude: {
                    type: GraphQLString
                },
                is_active: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (parent, args) => {
                return pg('merchant').where({id: args.id}).update(args).returning('*')
            }
        },
        toggleMerchant: {
            type: MerchantType,
            resolve: async (parent, args) => {
                return pg.transaction(async trx => {
                    const queries = []
                    const merchants = await pg('merchant').where({is_active: false})

                    merchants.forEach(merchant => {
                        queries.push(
                            pg('merchant').where({id: merchant.id}).update({is_active: true}).transacting(trx)
                        )
                    })

                    Promise.all(queries).then(trx.commit).catch(trx.rollback)
                })
            }
        }
    })
})

const schema = new GraphQLSchema({ query: QueryRoot, mutation: MutationRoot });

const app = express();

app.use('/api', graphqlHTTP({
    schema: schema,
    graphiql: true,
}));

app.listen(4000);
