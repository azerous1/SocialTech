import {React, useContext, useState, useEffect, useRef} from 'react';
import { observer } from "mobx-react";
import PropTypes from 'prop-types';
import UserComment from '../components/UserComment';
import { Alert, Card, Grid, Box } from '@mui/material';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import ImageGallery from '../components/ImageGallery'
import Rating from '@mui/material/Rating';
import appTheme from '../theme/appTheme.json';
import Button from '@mui/material/Button';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderOutlinedIcon from '@mui/icons-material/BookmarkBorderOutlined'
import IosShareIcon from '@mui/icons-material/IosShare';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CircularProgress from '@mui/material/CircularProgress'
import Modal from '@mui/material/Modal';
import text from "../text/text.json";
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Auth } from 'aws-amplify';
import PostCommentForm from '../components/PostCommentForm/PostCommentForm';
import TagContainer from '../components/SelectableTags/TagContainer';
import AppContext from '../AppContext';
import { useStore } from './Hook';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import ShelterClaimStatusText from '../components/ShelterClaimStatusText'
import Snackbar, { SnackbarOrigin } from '@mui/material/Snackbar';
import UserNotLoggedInPopOverContent from '../components/UserNotLoggedInPopOverContent';
import LoadingSpinner from '../components/LoadingSpinner';
import { LOADING_SPINNER_SIZE, ICON_RESPONSIVE_FONTSIZE } from '../utils/utilityFunctions';
import Pagination from '@mui/material/Pagination';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';

const WEBSITE_PLACEHOLDER = "https://www.google.com/"
const DISTANCE_PLACEHOLDER = 1.5 + "km"

const ShelterDetail = observer(({ shelterData }) => {

    console.log("shelterdetail sheter data", shelterData);
    const params = useParams();
    const { hash } = useLocation();
    const post_id = `${params.id}${hash}`;
    console.log("sheltercarddetail post_id", post_id)
    const { apiStore, appStore } = useStore();
    const currentShelterData = appStore.shelterData;
    console.log("currentShelterData", currentShelterData)
    const [comments, setComments] = useState([]);
    const [highlightedComment, setHighlightedComment] = useState(undefined);
    const shelterPostData = appStore.shelterData;
    const navigate = useNavigate();
    const appCtx = useContext(AppContext);
    console.log('highlightedComment', highlightedComment)
    const [isClaimed, setIsClaimed] = useState(undefined);
    const [loaderActive, setLoaderActive] = useState(true);
    const [isCommentSubmitted, setIsCommentSubmitted] = useState(false)
    const [bookmarkState, setBookmarkState] = useState(undefined);
    const [open, setOpen] = useState(false)
    const [openModal, setOpenModal] = useState(false);
    const [snackBarOpen, setSnackBarOpen] = useState(false)
    const buttonRef = useRef(null);
    console.log("bookmarkState", bookmarkState)
    const streetAddress = shelterPostData ? shelterPostData.street.toUpperCase() : ""
    const cityAddress = shelterPostData ? `${shelterPostData.city}, ${shelterPostData.state}, ${shelterPostData.zipcode}`.toUpperCase() : ""
    const fullAddress = `${streetAddress} ${cityAddress}`
    const [page, setPage] = useState(1)
    const [distance, setDistance] = useState(undefined)
    const [modalTitleStatus, setModalTitleStatus] = useState("")
    const [modalSubTitleStatus, setModalSubTitleStatus] = useState("")
    const [filterOption, setFilterOption] = useState("latest");
    const [currentUsername, setCurrentUsername] = useState(appStore.username)
    console.log(comments)

    useEffect(() => {
        (async () => {
            if (appStore.zipcode != "") {
                setDistance(await apiStore.getDistanceBetweenZipcodes(appStore.zipcode, fullAddress))
            }
        })()
    })
    const pageSize = 10;

    const getCommentData = async () => {
        try {
            const commentDataRes = await apiStore.loadComment(post_id);
            console.log("comment response: ", commentDataRes)
            setComments(commentDataRes)
        } catch (err) {
            console.log(err.message)
        }
    }

    const getShelterPostData = async () => {
        try {
            console.log("post_id before load summary: " + post_id)
            const shelterPostDataResponse = await apiStore.loadSummary(post_id);
            appStore.setShelterData(shelterPostDataResponse);

            console.log("shelter data response: ", shelterPostDataResponse)

            const topComment = await apiStore.getMostLikedComment(post_id);
            console.log("top/comment", topComment)
            if (topComment.length > 0) {
                appStore.setHighlightedComment(post_id, topComment[0])
                setHighlightedComment(topComment[0]);
                console.log("loading new comment data");
            }
        } catch (err) {
            console.error(err.message)
        }
    }

    const reloadData = async () => {
        getCommentData()
        getShelterPostData()
    }

    useEffect(() => {

        const loadBookmarks = async () => {
            try {
                let authRes = await Auth.currentAuthenticatedUser();
                let username = authRes.username;
                setCurrentUsername(username);
                console.log("username for bookmarks", username);
                let bookmarksResponse = await apiStore.getSavedBookmarks(username);
                console.log("bookmarksResponse amanda", bookmarksResponse)
                let res = bookmarksResponse.includes(post_id)
                console.log("res", res)
                setBookmarkState(bookmarksResponse.includes(post_id));
                setLoaderActive(false);
              } catch {
                setBookmarkState(false)
            }
        }

        const getClaimStatus = async() => {
            try {
                const claimStatus = await apiStore.getIsClaimed(post_id);
                console.log("claimStatus response: ", claimStatus)
                setIsClaimed(claimStatus)
                if (claimStatus == "no_claim") {
                    setModalTitleStatus("Unclaimed Buisness")
                    setModalSubTitleStatus("The buisness has not yet been claimed by the owner by the shelter or a representative")
                } else if (claimStatus == "pending") {
                    setModalTitleStatus("Pending Buisness")
                    setModalSubTitleStatus("The buisness is in process of verfication")
                } 
            } catch (err) {
                console.log(err.message)
            }
        }
        getShelterPostData();
        getCommentData();
        getClaimStatus();
        loadBookmarks();
    }, [])

    const handleBookmark = async () => {
        try {
            if (appCtx.user) {
                let bookmarkStatus = await apiStore.handleBookmark(post_id ,appCtx.user)
                setBookmarkState(bookmarkStatus.message)
            } else {
                setOpen(true)
            }
          } catch {
        }
    }

    const highlightedCommentEle = () => {
        if (comments === undefined) {
            return (
                <LoadingSpinner text={"Loading reviews"} size={LOADING_SPINNER_SIZE.small} />
            )
        } else if (comments.length === 0) {
            return null
        } else {
            if (highlightedComment) {
                return <UserComment 
                        commentData={highlightedComment} 
                        isHighLighted={true}
                        reloadData={reloadData}
                        shelterName={currentShelterData.title}
                        shelter_post_id={post_id}
                        onLike={getCommentData}
                        isEditAndDeleteable={currentUsername && currentUsername == highlightedComment.username}/>
            }
        }
    }
    
    const commentEles = () => {
        if (comments === undefined) {
            return (
                <LoadingSpinner text={"Loading comments"} size={LOADING_SPINNER_SIZE.small} />
            )
        } else if (comments.length === 0) {
            return (
                <Grid   
                container
                direction="column"
                justifyContent="center" 
                alignItems="center"
                style={{height: "15vh"}}>
                    <Typography>No comments for this shelter yet</Typography>
                </Grid>
            )
        } else {
            console.log('comments', comments)
            let sortedComments;
            if (filterOption == "latest") {
                sortedComments = comments.slice().sort((a, b) => b.post_time.localeCompare(a.post_time))
            } else if (filterOption == "oldest") {
                sortedComments = comments.slice().sort((a, b) => a.post_time.localeCompare(b.post_time))
            } else if (filterOption == "likes")  {
                sortedComments = comments.slice().sort((a, b) => b.likes - a.likes)
            }  else if (filterOption == "rating") {
                sortedComments = comments.slice().sort((a, b) => b.rating - a.rating)
            } else {
                console.error("no filter option defined for ", filterOption)
            }
            console.log("sorted", sortedComments)
            const commentPage = sortedComments.slice(pageSize * (page - 1), pageSize * page);
            console.log("commentPage", commentPage)
            console.log("commentPage post_id", post_id);
            return commentPage
                .filter((commentData) => highlightedComment && commentData && (commentData.comment_id !== highlightedComment.comment_id))
                .map((commentData) => <UserComment 
                                shelterName={currentShelterData.title}
                                shelter_post_id={post_id}
                                commentData={commentData} 
                                isHighLighted={false} 
                                key={commentData.comment_id}
                                onLike={getCommentData}
                                reloadData={reloadData}
                                isEditAndDeleteable={currentUsername && currentUsername == commentData.username}/> 
            )
        }
    }

    const [openPostCommentForm, setOpenPostCommentForm] = useState(false);

    const handleOpen = () => {
        if (appCtx.user !==null) {
            setOpenPostCommentForm(true);
        } else {
            navigate("/app/auth/sign-in")
        }
    }

    const handleClose = () => {
        //TODO: Amanda
        setOpenPostCommentForm(false);
        setIsCommentSubmitted(true);
        getCommentData()
        getShelterPostData()
        setSnackBarOpen(true)
    }

    const handleGetDirection = (e) => {
          e.preventDefault();
          let url = "http://maps.google.com/?q=";
          let endAddress = fullAddress
          endAddress = endAddress.replace(/\s/g, "+")
          console.log(endAddress);
          url = url + endAddress
          console.log(url);
          window.location.href=url;
    }

    const favoriteIcon = () => bookmarkState? 
        <IconButton onClick={handleBookmark} >
            <BookmarkIcon sx={{ fontSize: 50 }} style={{color: appTheme.palette.primary.main, marginLeft: "0px"}}/>
        </IconButton> :
        (<>
        <IconButton onClick={handleBookmark} ref={buttonRef}>
            <BookmarkBorderOutlinedIcon sx={ICON_RESPONSIVE_FONTSIZE}/>
        </IconButton>
        <Popover open={open} onClose={() => setOpen(false)} anchorEl={buttonRef.current}>
            <UserNotLoggedInPopOverContent />
        </Popover>
        </>)

    const handleChange = (event) => {
        setFilterOption(event.target.value);
        console.log('event.target.value',event.target.value);
        // sortDataByOption();
        // appStore.setSearchOption(event.target.value);
    };

    //Amanda here
    // useEffect(() => {
    //     // setSearchBarOption(appStore.searchOption)\
    //     sortDataByOption();
    // }, [filterOption])

    // const sortDataByOption = async () => {
    //     try {
    //         if (comments.length == 0) {
    //             return
    //         } 
    //         console.log("filterOption when filtering", filterOption)
    //         console.log(comments)
    //         if (filterOption == "latest") {
    //             setComments(comments.slice().sort((a, b) => b.post_time.localeCompare(a.post_time)))
    //         } else if (filterOption == "oldest") {
    //             setComments(comments.slice().sort((a, b) => a.post_time.localeCompare(b.post_time)))
    //         } else if (filterOption == "star")  {
    //             setComments(comments.slice().sort((a, b) => b.likes - a.likes))
    //         }  else if (filterOption == "rating"){
    //             setComments(comments.slice().sort((a, b) => b.rating - a.rating))
    //         }   
    //     } catch (err) {
    //         console.log(err.message)
    //     }
    // }

    return (
        <>


        <Grid 
            container
            direction="column"
            justifyContent="flex-start"
            alignItems="center"
            style={{height: "100vh"}}
            >
            <Grid
                container
                direction="column"
                justifyContent="flex-start"
                alignItems="center"
                wrap="nowrap"
                rowSpacing={2}
                style={{maxWidth: "50em", padding: "20px"}}>
            {shelterPostData && 
                <Grid
                    item
                    container
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    style={{margin: "80px 0 30px 0"}}
                    spacing={1}
                    >
                    <Button 
                    onClick={() => {
                        navigate("/app/dashboard")
                    }}>
                        {text.shelterDetail.backButton
                    }</Button>
                    <Typography variant="h3"style={{marginRight: "40px" }}>{shelterPostData.title}</Typography>
                        {bookmarkState !== undefined && favoriteIcon()}  
                        {/* Disable share icon for now. May come back and implement it */}
                        {/* <IosShareIcon/> */}
                </Grid>
                }
                {shelterPostData === undefined ? 
                <LoadingSpinner text={"Loading Shelter Data"} size={LOADING_SPINNER_SIZE.medium} />
                 :
                <>
                    <ImageGallery imgAddr={shelterPostData.profile_pic_path}/>
                    <Grid
                        item
                        container
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center">
                        <Grid 
                            item
                            container
                            direction="row">
                        <ShelterClaimStatusText postId={shelterPostData.post_id} currentUsername={currentUsername}modalSubTitleStatus={modalSubTitleStatus} modalTitleStatus = {modalTitleStatus} openModal={openModal} setOpenModal={setOpenModal} claim_status={isClaimed}/>
                        </Grid>
                    </Grid>

                    <Grid
                        item
                        container
                        direction="column"
                        alignItems="flex-start">
                        Overall Rating: 
                        <Rating name="size-large" value={shelterPostData.avg_rating}  sx={{fontSize: "2rem"}} readOnly precision={0.5} style={{color: appTheme.palette.primary.main }}/>

                        <TagContainer tagData={shelterPostData.utilities} isSelectable={false}/>
                    </Grid>
                    
                    <Grid
                        item
                        container
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        rowSpacing={2}>
                        <Grid
                            item
                            container
                            direction="column"
                            justifyContent="space-between"
                            alignItems="flex-start">
                            <Typography  style={{fontWeight: "bold"}}>{streetAddress}</Typography>
                            <Typography style={{fontWeight: "bold"}}>{cityAddress}</Typography>
                        </Grid>
                        <Grid 
                            item
                            container
                            direction="row">
                        {distance && <Typography>{`${distance} away`}</Typography>}
                        </Grid>
                        <Grid item>
                            <Button variant="contained" onClick={handleGetDirection}>{text.shelterDetail.directToHereButtonText}</Button>
                        </Grid>
                    </Grid>
                </>}                
                {shelterPostData !== undefined && 
                <Grid
                    item
                    container
                    direction="row"
                    justifyContent="space-around"
                    alignItems="center">
                    <Button variant="outlined">
                        <a href={WEBSITE_PLACEHOLDER} style={{textDecoration: "none", color: appTheme.palette.primary.main}}>
                            {text.shelterDetail.visitWebSiteButtonText}
                        </a>
                    </Button>
                </Grid>}
        {shelterPostData !== undefined && 
            <Grid
                container
                direction="column" 
                justifyContent="flex-start" 
                alignItems="center"
                spacing={1}>
                    <PostCommentForm
                        shelterName={shelterPostData.title}
                        shelter_post_id={post_id}
                        handleClose={handleClose}
                        isUpdateComment={false}
                        commentData={null}
                    />
                    </Grid>
        }

            <Snackbar
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',}}
                autoHideDuration={6000}
                open={snackBarOpen}
                onClose={() => setSnackBarOpen(false)}
            >
                <Alert severity="success">Comment submitted!</Alert>
            </Snackbar>

            <Divider style={{width: "100%", marginTop: "20px", marginBottom: "20px"}}/>
            <Grid style={{width: "100%"}}>{highlightedCommentEle()}</Grid>
               
                <Divider style={{width: "100%", marginTop: "20px", marginBottom: "20px"}}/>
                <Grid
                    item
                    container
                    direction="row"
                    justifyContent="flex-start"
                    alignItems="center">
                    <Typography>{text.shelterDetail.otherReviewSectionHeader}</Typography>
                </Grid>
                <FormControl fullWidth>
                        <InputLabel id="demo-simple-select-label">option</InputLabel>
                        <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={filterOption}
                        label="option"
                        onChange={handleChange}
                        >
                        <MenuItem value={'latest'}>latest</MenuItem>
                        <MenuItem value={'oldest'}>oldest</MenuItem>
                        <MenuItem value={'likes'}>number of Likes</MenuItem>
                        <MenuItem value={'rating'}>rating</MenuItem>
                        </Select>
                </FormControl>
                <Grid style={{width: "100%"}}>{commentEles()}</Grid>
                <Pagination count={Math.floor(comments.length / pageSize) + ((comments.length % pageSize == 0) ? 0 : 1)} page={page} onChange={(event, value) => {console.log(event); console.log(value); setPage(value)}} />
            </Grid>
        </Grid>
        </>
    );
});

ShelterDetail.propTypes = {
    data: PropTypes.array,
};

export default ShelterDetail;
