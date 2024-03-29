import {
  AskCreated,
  AskRemoved,
  BidCreated,
  BidFinalized,
  BidRemoved,
  BidShareUpdated,
} from '../types/ItemExchange/ItemExchange'
import { BigInt, log, store } from '@graphprotocol/graph-ts'
import { Ask, Bid, Item, Transfer } from '../types/schema'
import {
  createAsk,
  createBid,
  createInactiveAsk,
  createInactiveBid,
  findOrCreateCurrency,
  findOrCreateUser,
  fetchItemAddress,
  zeroAddress,
} from './helpers'

const REMOVED = 'Removed'
const FINALIZED = 'Finalized'
 
/*var itemExchangeAddressArray = new Array<string>();
itemExchangeAddressArray.push("0xc2975685ae4c31cb88b36a5c6cac423dc8ad17ce");

 */
/**
 * Handler called when a `BidShareUpdated` Event is emitted on the Motif ItemExchange Contract
 * @param event
 */
export function handleBidShareUpdated(event: BidShareUpdated): void {
  let tokenId = event.params.tokenId.toString()
  let bidShares = event.params.bidShares
  
  log.info(`ITEMEXCHANGE: Starting handler for BidShareUpdated Event for tokenId: {}, bidShares: {}`, [
    tokenId,
    bidShares.toString() 
  ])

   let tokenExchangeContractAddress = event.address.toHexString()
/*   if (!itemExchangeAddressArray.includes(tokenExchangeContractAddress)) {
      log.info(`tokenExchangeContractAddress: {} is not ItemExchange for token: {} -> not proceeding`, [tokenExchangeContractAddress, tokenId]);
      return;
   }
*/
  let tokenContractAddress = fetchItemAddress(event.params.tokenId,event.address) 
   
  let token = tokenContractAddress.concat('-').concat(tokenId.toString())  
  let item = Item.load(token)

  if (item == null) {
    log.error('Item is null for tokenId: {}', [tokenId])
  } 

  item.creatorBidShare = bidShares.creator.value
  item.ownerBidShare = bidShares.owner.value
  item.prevOwnerBidShare = bidShares.prevOwner.value
  item.save()

  log.info(`Completed handler for BidShareUpdated Event for tokenId: {}, bidShares: {}`, [
    tokenId,
    bidShares.toString(),
  ])
}

/**
 * Handler called when the `AskCreated` Event is emitted on the Motif ItemExchange Contract
 * @param event
 */
export function handleAskCreated(event: AskCreated): void {
  let tokenId = event.params.tokenId.toString()
  let onchainAsk = event.params.ask

   let tokenExchangeContractAddress = event.address.toHexString()
 /*  if (!itemExchangeAddressArray.includes(tokenExchangeContractAddress)) {
      log.info(`tokenExchangeContractAddress: {} is not ItemExchange for token: {} -> not proceeding`, [tokenExchangeContractAddress, tokenId]);
      return;
   }*/


  log.info(`Starting handler for AskCreated Event for tokenId: {}, ask: {}`, [
    tokenId,
    onchainAsk.toString(),
  ])

  let tokenContractAddress = fetchItemAddress(event.params.tokenId,event.address) 
  let token = tokenContractAddress.concat('-').concat(tokenId.toString())  
  let item = Item.load(token)

  if (item == null) {
    log.error('Item is null for tokenId: {}', [tokenId])
  }

  let currency = findOrCreateCurrency(onchainAsk.currency.toHexString())
  let askId = item.id.concat('-').concat(item.owner)
  let ask = Ask.load(askId)

  if (ask == null) {
    createAsk(
      askId,
      event.transaction.hash.toHexString(),
      onchainAsk.amount,
      currency,
      item as Item,
      event.block.timestamp,
      event.block.number
    )
  } else {
    let inactiveAskId = tokenId
      .concat('-')
      .concat(event.transaction.hash.toHexString())
      .concat('-')
      .concat(event.transactionLogIndex.toString())

    // create an inactive ask
    createInactiveAsk(
      inactiveAskId,
      event.transaction.hash.toHexString(),
      item as Item,
      REMOVED,
      ask.amount,
      currency,
      ask.owner,
      ask.createdAtTimestamp,
      ask.createdAtBlockNumber,
      event.block.timestamp,
      event.block.number
    )

    // update the fields on the original ask object
    ask.amount = onchainAsk.amount
    ask.currency = currency.id
    ask.createdAtTimestamp = event.block.timestamp
    ask.createdAtBlockNumber = event.block.number
    ask.save()
  }

  log.info(`Completed handler for AskCreated Event for tokenId: {}, ask: {}`, [
    tokenId,
    onchainAsk.toString(),
  ])
}

/**
 * Handler called when the `AskRemoved` Event is emitted on the Motif ItemExchange Contract
 * @param event
 */
export function handleAskRemoved(event: AskRemoved): void {
  let tokenId = event.params.tokenId.toString()
  let onChainAsk = event.params.ask
  let askId: string

   let tokenExchangeContractAddress = event.address.toHexString()
/*   if (!itemExchangeAddressArray.includes(tokenExchangeContractAddress)) {
      log.info(`tokenExchangeContractAddress: {} is not ItemExchange for token: {} -> not proceeding`, [tokenExchangeContractAddress, tokenId]);
      return;
   }*/

  log.info(`Starting handler for AskRemoved Event for tokenId: {}`, [tokenId])

  let zero = BigInt.fromI32(0)
  // asks must be > 0 and evenly split by bidshares
  if (onChainAsk.amount.equals(zero)) {
    log.info(
      `AskRemoved Event has a 0 amount, returning early and not updating state`,
      []
    )
    askId = zeroAddress
  } else {

  let tokenContractAddress = fetchItemAddress(event.params.tokenId,event.address) 
  let token = tokenContractAddress.concat('-').concat(tokenId.toString())  
  let item = Item.load(token)

    if (item == null) {
      log.error('Item is null for tokenId: {}', [tokenId])
    }

    let currency = findOrCreateCurrency(onChainAsk.currency.toHexString())

    askId = tokenId.concat('-').concat(item.owner)
    let ask = Ask.load(askId)
    if (ask == null) {
      log.error('Ask is null for askId: {}', [askId])
    }

    let inactiveAskId = tokenId
      .concat('-')
      .concat(event.transaction.hash.toHexString())
      .concat('-')
      .concat(event.transactionLogIndex.toString())

    createInactiveAsk(
      inactiveAskId,
      event.transaction.hash.toHexString(),
      item as Item,
      REMOVED,
      ask.amount,
      currency,
      ask.owner,
      ask.createdAtTimestamp,
      ask.createdAtBlockNumber,
      event.block.timestamp,
      event.block.number
    )

    store.remove('Ask', askId)
  }

  log.info(`Completed handler for AskRemoved Event for tokenId: {}, askId: {}`, [
    tokenId,
    askId,
  ])
}

/**
 * Handler called `BidCreated` Event is emitted on the Motif ItemExchange Contract
 * @param event
 */
export function handleBidCreated(event: BidCreated): void {
  let tokenId = event.params.tokenId.toString()

   let tokenExchangeContractAddress = event.address.toHexString()
  /* if (!itemExchangeAddressArray.includes(tokenExchangeContractAddress)) {
      log.info(`tokenExchangeContractAddress: {} is not ItemExchange for token: {} -> not proceeding`, [tokenExchangeContractAddress, tokenId]);
      return;
   }
*/
  let tokenContractAddress = fetchItemAddress(event.params.tokenId,event.address) 
  let token = tokenContractAddress.concat('-').concat(tokenId.toString())  
  let item = Item.load(token)

  let bid = event.params.bid

  log.info(`Starting handler for BidCreated Event for tokenId: {}, bid: {}`, [
    tokenId,
    bid.toString(),
  ])

  if (item == null) {
    log.error('Item is null for tokenId: {}', [tokenId])
  }

  let bidId = item.id.concat('-').concat(bid.bidder.toHexString())

  let bidder = findOrCreateUser(bid.bidder.toHexString())
  let recipient = findOrCreateUser(bid.recipient.toHexString())

  let currency = findOrCreateCurrency(bid.currency.toHexString())

  createBid(
    bidId,
    event.transaction.hash.toHexString(),
    bid.amount,
    currency,
    bid.sellOnShare.value,
    bidder,
    recipient,
    item as Item,
    event.block.timestamp,
    event.block.number
  )

  // Update Currency Liquidity
  currency.liquidity = currency.liquidity.plus(bid.amount)
  currency.save()

  log.info(`Completed handler for BidCreated Event for tokenId: {}, bid: {}`, [
    tokenId,
    bid.toString(),
  ])
}

/**
 * Handler called when the `BidRemoved` Event is emitted on the Motif ItemExchange Contract
 * @param event
 */
export function handleBidRemoved(event: BidRemoved): void {
  let tokenId = event.params.tokenId.toString()

   let tokenExchangeContractAddress = event.address.toHexString()
 /*  if (!itemExchangeAddressArray.includes(tokenExchangeContractAddress)) {
      log.info(`tokenExchangeContractAddress: {} is not ItemExchange for token: {} -> not proceeding`, [tokenExchangeContractAddress, tokenId]);
      return;
   }*/
 
  let tokenContractAddress = fetchItemAddress(event.params.tokenId,event.address) 
  let token = tokenContractAddress.concat('-').concat(tokenId.toString())  
  let item = Item.load(token)

  let onChainBid = event.params.bid

  let bidId = tokenId.concat('-').concat(onChainBid.bidder.toHexString())

  log.info(`Starting handler for BidRemoved Event for tokenId: {}, bid: {}`, [
    tokenId,
    bidId,
  ])

  if (item == null) {
    log.error('Item is null for tokenId: {}', [tokenId])
  }

  let bid = Bid.load(bidId)
  if (bid == null) {
    log.error('Bid is null for bidId: {}', [bidId])
  }

  let inactiveBidId = tokenId
    .concat('-')
    .concat(event.transaction.hash.toHexString())
    .concat('-')
    .concat(event.transactionLogIndex.toString())
  let bidder = findOrCreateUser(onChainBid.bidder.toHexString())
  let recipient = findOrCreateUser(onChainBid.recipient.toHexString())
  let currency = findOrCreateCurrency(onChainBid.currency.toHexString())

  // Create Inactive Bid
  createInactiveBid(
    inactiveBidId,
    event.transaction.hash.toHexString(),
    REMOVED,
    item as Item,
    onChainBid.amount,
    currency,
    onChainBid.sellOnShare.value,
    bidder,
    recipient,
    bid.createdAtTimestamp,
    bid.createdAtBlockNumber,
    event.block.timestamp,
    event.block.number
  )

  // Update Currency Liquidity
  currency.liquidity = currency.liquidity.minus(bid.amount)
  currency.save()

  // Remove Bid
  store.remove('Bid', bidId)
  log.info(`Completed handler for BidRemoved Event for tokenId: {}, bid: {}`, [
    tokenId,
    bidId,
  ])
}

/**
 * Handler called when the `BidFinalized` Event is emitted on the Motif ItemExchange Contract
 * @param event
 */
export function handleBidFinalized(event: BidFinalized): void {
  let tokenId = event.params.tokenId.toString()

   let tokenExchangeContractAddress = event.address.toHexString()
  /* if (!itemExchangeAddressArray.includes(tokenExchangeContractAddress)) {
      log.info(`tokenExchangeContractAddress: {} is not ItemExchange for token: {} -> not proceeding`, [tokenExchangeContractAddress, tokenId]);
      return;
   }*/
  
  let tokenContractAddress = fetchItemAddress(event.params.tokenId,event.address) 
  let token = tokenContractAddress.concat('-').concat(tokenId.toString())  
  let item = Item.load(token)

  let onChainBid = event.params.bid

  let bidId = tokenId.concat('-').concat(onChainBid.bidder.toHexString())
  log.info(`Starting handler for BidFinalized Event for tokenId: {}, bid: {}`, [
    tokenId,
    bidId,
  ])

  if (item == null) {
    log.error('Item is null for tokenId: {}', [tokenId])
  }

  //uncomment this if necessary
  // let bid = Bid.load(bidId)
  // if (bid == null) {
  //   log.error('Bid is null for bidId: {}', [bidId])
  // }

  let inactiveBidId = tokenId
    .concat('-')
    .concat(event.transaction.hash.toHexString())
    .concat('-')
    .concat(event.transactionLogIndex.toString())

  let bidder = findOrCreateUser(onChainBid.bidder.toHexString())
  let recipient = findOrCreateUser(onChainBid.recipient.toHexString())
  let currency = findOrCreateCurrency(onChainBid.currency.toHexString())

  // BidFinalized is always **two** events after transfer
  // https://github.com/ourzora/core/blob/master/contracts/ItemExchange.sol#L349
  // Find the transfer by id and set the from address as the prevOwner of the item
  let transferId = event.params.tokenId
    .toString()
    .concat('-')
    .concat(event.transaction.hash.toHexString())
    .concat('-')
    .concat(event.transactionLogIndex.minus(BigInt.fromI32(2)).toString())
  let transfer = Transfer.load(transferId)
  if (transfer == null) {
    log.error('Transfer is null for transfer id: {}', [transferId])
  }

  item.prevOwner = transfer.from
  item.save()

  // Create Inactive Bid
  createInactiveBid(
    inactiveBidId,
    event.transaction.hash.toHexString(),
    FINALIZED,
    item as Item,
    onChainBid.amount,
    currency,
    onChainBid.sellOnShare.value,
    bidder,
    recipient,
   event.block.timestamp, //bid.createdAtTimestamp,
   event.block.number,//bid.createdAtBlockNumber,
    event.block.timestamp,
    event.block.number
  )



  // Update Currency Liquidity
  //currency.liquidity = currency.liquidity.minus(bid.amount)
  currency.liquidity = currency.liquidity.minus(onChainBid.amount)//  bid.amount



  currency.save()

  // Remove Bid
  store.remove('Bid', bidId)
  log.info(`Completed handler for BidFinalized Event for tokenId: {}, bid: {}`, [
    tokenId,
    bidId,
  ])
}
