import { module } from '@prisma/composer'
import webService from './service.ts'

export default module('recipes', ({ provision }) => {
  provision(webService)
})
