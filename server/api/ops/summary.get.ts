import { getOpsSummary } from '../../utils/repository'

export default defineEventHandler(event => getOpsSummary(event))
