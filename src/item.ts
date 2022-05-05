import { Item } from "../types/schema";
import { Approval, ApprovalForAll, Item as ItemContract, TokenMetadataURIUpdated, TokenURIUpdated, Transfer } from "../types/Item/Item";
import { log } from "@graphprotocol/graph-ts";
import { createItem, createTransfer, createURIUpdate, fetchItemBidShares, findOrCreateUser, zeroAddress } from "./helpers";


const CONTENT = "Content";
const METADATA = "Metadata";

var itemAddressArray = new Array<string>();
itemAddressArray.push("0xE66d6BFef4D0125b237db8fBD1210fC9b18D72Af"); //LOWERCASE!!!!!!!!!!!!!!!!!!!!!!!!


/**
 * Handler called when the `TokenURIUpdated` Event is called on the Motif Contract
 * @param event
 */
export function handleTokenURIUpdated(event: TokenURIUpdated): void {
   let tokenId = event.params._tokenId.toString();

   log.info(`Starting handler for TokenURIUpdated Event for tokenId: {}`, [tokenId]);

   let tokenContractAddress = event.address.toHexString();
   if (!itemAddressArray.includes(tokenContractAddress)) {
      log.info(`ITEM: tokenContractAddress: {} is not Item for token: {} -> not proceeding`, [tokenContractAddress, tokenId]);
      return;
   } 


   let token = tokenContractAddress.concat("-").concat(tokenId);
   let item = Item.load(token);

   if (item == null) {
      log.error("Item is null for tokenId: {}", [tokenId]);
   }

   let updater = findOrCreateUser(event.params.owner.toHexString());
   let uriUpdateId = tokenId.concat("-").concat(event.transaction.hash.toHexString()).concat("-").concat(event.transactionLogIndex.toString());

   createURIUpdate(
      uriUpdateId,
      event.transaction.hash.toHexString(),
      item as Item,
      CONTENT,
      item.contentURI,
      event.params._uri,
      updater.id,
      item.owner,
      event.block.timestamp,
      event.block.number
   );

   item.contentURI = event.params._uri;
   item.save();

   log.info(`Completed handler for TokenURIUpdated Event for tokenId: {}`, [tokenId]);
}

/**
 * Handler called when the `TokenMetadataURIUpdated` Event is called on the Motif Contract
 * @param event
 */
export function handleTokenMetadataURIUpdated(event: TokenMetadataURIUpdated): void {
   let tokenId = event.params._tokenId.toString();

   log.info(`Starting handler for TokenMetadataURIUpdated Event for tokenId: {}`, [tokenId]);

   let tokenContractAddress = event.address.toHexString();
   if (!itemAddressArray.includes(tokenContractAddress)) {
      log.info(`ITEM: tokenContractAddress: {} is not Item for token: {} -> not proceeding`, [tokenContractAddress, tokenId]);
      return;
   }
 
   let token = tokenContractAddress.concat("-").concat(tokenId);
   let item = Item.load(token);

   if (item == null) {
      log.error("Item is null for tokenId: {}", [tokenId]);
   }

   let updater = findOrCreateUser(event.params.owner.toHexString());
   let uriUpdateId = tokenId.concat("-").concat(event.transaction.hash.toHexString()).concat("-").concat(event.transactionLogIndex.toString());

   createURIUpdate(
      uriUpdateId,
      event.transaction.hash.toHexString(),
      item as Item,
      METADATA,
      item.metadataURI,
      event.params._uri,
      updater.id,
      item.owner,
      event.block.timestamp,
      event.block.number
   );

   item.metadataURI = event.params._uri;
   item.save();

   log.info(`Completed handler for TokenMetadataURIUpdated Event for tokenId: {}`, [tokenId]);
}

/**
 * Handler called when the `Transfer` Event is called on the Motif Contract
 * @param event
 */
export function handleTransfer(event: Transfer): void {
   let fromAddr = event.params.from.toHexString();
   let toAddr = event.params.to.toHexString();
   let tokenId = event.params.tokenId.toString();

   log.info(`ITEM: Starting handler for Transfer Event of tokenId: {}, from: {}. to: {}`, [tokenId, fromAddr, toAddr]);
  
   /*  
	let itemContract = ItemContract.bind(event.address); 
	let itemIdentifier = itemContract.getItemIdentifier();   
 	if (itemContract.itemIdentifier().toString() == null) { //dont work
   	log.info(`ITEM: CANNOT DO ITEMCONTRACT, NOT PROCEEDING  : {}`,[tokenId]);
      return;
   } 
   if (itemIdentifier.toString() == null) {  //dont work
   	log.info(`ITEM: CANNOT DO ITEMCONTRACT, NOT PROCEEDING  : {}`,[tokenId]);
      return;
   }  
 	
   let itemIdentifierString = itemIdentifier.toString();
   log.info(`ITEM: itemIdentifierString: {}`, [itemIdentifierString]); 
   if (itemIdentifierString != "8107") {
      log.info(`ITEM: itemIdentifierString not right, NOT PROCEEDING : {}`, [itemIdentifierString]);
      return;
   } 
   */  
  
   let tokenContractAddress = event.address.toHexString();
   if (!itemAddressArray.includes(tokenContractAddress)) {
      log.info(`ITEM: tokenContractAddress: {} is not Item for token: {} -> not proceeding`, [tokenContractAddress, tokenId]);
      return;
   }
 
   // let itemContract = ItemContract.bind(event.address);
   //let tokenContractAddress = event.address.toHexString();
   // let itemExchangeAddress = itemContract.itemExchangeContract();
   // let itemIdentifier = itemContract.itemIdentifier(); 

   // if (itemIdentifier.toString() != "8107") {
   //    log.info(`ITEM: identifier not right tokenId: {}`, [tokenId]);
   //    return;
   // }


   let toUser = findOrCreateUser(toAddr);
   let fromUser = findOrCreateUser(fromAddr);

   if (fromUser.id == zeroAddress) {
      handleMint(event);
      return;
   }

   let token = tokenContractAddress.concat("-").concat(tokenId);
   let item = Item.load(token);

   if (item == null) {
      log.error(`Item is null for token id: {}`, [tokenId]);
   }

   if (toUser.id == zeroAddress) {
      item.prevOwner = zeroAddress;
      item.burnedAtTimeStamp = event.block.timestamp;
      item.burnedAtBlockNumber = event.block.number;
   }

   item.owner = toUser.id;
   item.approved = null;
   item.save();

   let transferId = tokenId.concat("-").concat(event.transaction.hash.toHexString()).concat("-").concat(event.transactionLogIndex.toString());

   createTransfer(transferId, event.transaction.hash.toHexString(), item as Item, fromUser, toUser, event.block.timestamp, event.block.number);

   log.info(`Completed handler for Transfer Event of tokenId: {}, from: {}. to: {}`, [tokenId, fromAddr, toAddr]);
}

/**
 * Handler called when the `Approval` Event is called on the Motif Contract
 * @param event
 */
export function handleApproval(event: Approval): void {
   let ownerAddr = event.params.owner.toHexString();
   let approvedAddr = event.params.approved.toHexString();
   let tokenId = event.params.tokenId.toString();

   log.info(`Starting handler for Approval Event of tokenId: {}, owner: {}, approved: {}`, [tokenId, ownerAddr, approvedAddr]);

   let tokenContractAddress = event.address.toHexString();
   if (!itemAddressArray.includes(tokenContractAddress)) {
      log.info(`tokenContractAddress: {} is not Item for token: {} -> not proceeding`, [tokenContractAddress, tokenId]);
      return;
   }

   let token = tokenContractAddress.concat("-").concat(tokenId);
   let item = Item.load(token);

   if (item == null) {
      log.error("Item is null for tokenId: {}", [tokenId]);
   }

   if (approvedAddr == zeroAddress) {
      item.approved = null;
   } else {
      let approvedUser = findOrCreateUser(approvedAddr);
      item.approved = approvedUser.id;
   }

   item.save();

   log.info(`Completed handler for Approval Event of tokenId: {}, owner: {}, approved: {}`, [tokenId, ownerAddr, approvedAddr]);
}

/**
 * Handler called when the `ApprovalForAll` Event is called on the Motif Contract
 * @param event
 */
export function handleApprovalForAll(event: ApprovalForAll): void {
   let ownerAddr = event.params.owner.toHexString();
   let operatorAddr = event.params.operator.toHexString();
   let approved = event.params.approved;

   log.info(`Starting handler for ApprovalForAll Event for owner: {}, operator: {}, approved: {}`, [ownerAddr, operatorAddr, approved.toString()]);

   let tokenContractAddress = event.address.toHexString();
   if (!itemAddressArray.includes(tokenContractAddress)) {
      log.info(`tokenContractAddress: {} is not Item for -> not proceeding`, [tokenContractAddress]);
      return;
   }

   let owner = findOrCreateUser(ownerAddr);
   let operator = findOrCreateUser(operatorAddr);

   if (approved == true) {
      owner.authorizedUsers = owner.authorizedUsers.concat([operator.id]);
   } else {
      // if authorizedUsers array is null, no-op
      if (!owner.authorizedUsers) {
         log.info("Owner does not currently have any authorized users. No db changes neccessary. Returning early.", []);
         log.info(`Completed handler for ApprovalForAll Event for owner: {}, operator: {}, approved: {}`, [
            ownerAddr,
            operatorAddr,
            approved.toString(),
         ]);
         return;
      }

      let index = owner.authorizedUsers.indexOf(operator.id);
      let copyAuthorizedUsers = owner.authorizedUsers;
      copyAuthorizedUsers.splice(index, 1);
      owner.authorizedUsers = copyAuthorizedUsers;
   }

   owner.save();

   log.info(`Completed handler for ApprovalForAll Event for owner: {}, operator: {}, approved: {}`, [ownerAddr, operatorAddr, approved.toString()]);
}

/**
 * Handler called when the `Mint` Event is called on the Motif Contract
 * @param event
 */
function handleMint(event: Transfer): void {
   let creator = findOrCreateUser(event.params.to.toHexString());
   let zeroUser = findOrCreateUser(zeroAddress);
   let tokenId = event.params.tokenId;

   let itemContract = ItemContract.bind(event.address);
   let contentURI = itemContract.tokenURI(tokenId);
   let metadataURI = itemContract.tokenMetadataURI(tokenId);

   log.info(`ITEM: event.address: {}`, [event.address.toHexString()]);


   let tokenContractAddress = event.address.toHexString();
   if (!itemAddressArray.includes(tokenContractAddress)) {
      log.info(`tokenContractAddress: {} is not Item for -> not proceeding`, [tokenContractAddress]);
      return;
   }
   

   let contentHash = itemContract.tokenContentHashes(tokenId);
   let metadataHash = itemContract.tokenMetadataHashes(tokenId);

   let tokenContract = itemContract.tokenContractAddresses(tokenId);

   let bidShares = fetchItemBidShares(tokenId, event.address);

 
   let token = tokenContractAddress.concat("-").concat(tokenId.toString());

   let itemExchangeAddress = itemContract.itemExchangeContract(); 
 
   let item = createItem(
      token,
      tokenId.toString(),
      event.transaction.hash.toHexString(),
      creator,
      creator,
      creator,
      contentURI,
      contentHash,
      metadataURI,
      metadataHash,
      event.address.toHexString(),
      itemExchangeAddress.toHexString(),
      bidShares.creator,
      bidShares.owner,
      bidShares.prevOwner,
      event.block.timestamp,
      event.block.number
   );
   //
   let transferId = tokenId
      .toString()
      .concat("-")
      .concat(event.transaction.hash.toHexString())
      .concat("-")
      .concat(event.transactionLogIndex.toString());

   createTransfer(transferId, event.transaction.hash.toHexString(), item, zeroUser, creator, event.block.timestamp, event.block.number);
}



// DO NOT DELETE
// var itemAddressArray = new Array<string>();
// itemAddressArray.push("0x4b60c6d01f2448e38026ef4830297d0dce008d09");
// if (!itemAddressArray.includes(tokenContractAddress)) {
//    log.info(`tokenContractAddress: {} is not Item for token: {} -> not proceeding`, [tokenContractAddress, tokenId]);
//    return;
// }

